import type { City, Tile } from '../game/types'
import type { MapCityTemplate, MapTemplate } from '../domain/maps'
import { deepClone } from '../domain/adapters'
import { fail, ok, type ConversionResult } from '../domain/result'
import { validateMapTemplate } from '../domain/validators'
import { isoNow, newEntityId } from './mapFactory'

/** Legacy editor / file exchange shape (version 1). Unchanged schema. */
export interface LegacyMapJsonV1 {
  version: number
  mapWidth: number
  mapHeight: number
  savedAt?: string
  tiles: Record<string, Tile>
  cities?: City[]
  civilizations?: unknown
  settings?: unknown
}

export interface MapImportResult {
  map: MapTemplate
  ignoredSections: string[]
}

function cityToTemplate(city: City): MapCityTemplate {
  return {
    id: city.id,
    name: city.name,
    coord: { ...city.coord },
    startingPopulation: Math.max(1, city.population || 1),
  }
}

function templateCityToLegacy(city: MapCityTemplate): City {
  return {
    id: city.id,
    civId: null,
    name: city.name,
    coord: { ...city.coord },
    population: city.startingPopulation,
    productionQueue: [],
    culture: 0,
    isCapital: false,
    growthRateBonus: 0,
  }
}

/**
 * Convert a legacy v1 map JSON object into a catalog MapTemplate.
 * Civilizations and settings are intentionally ignored (not persisted by map import).
 */
export function legacyV1JsonToMapTemplate(
  parsed: unknown,
  options?: { name?: string; description?: string },
): ConversionResult<MapImportResult> {
  if (!parsed || typeof parsed !== 'object') {
    return fail('File is not a JSON object')
  }
  const data = parsed as Partial<LegacyMapJsonV1>
  if (data.version != null && data.version !== 1) {
    return fail(`Unsupported map JSON version: ${String(data.version)} (expected 1)`)
  }
  if (!data.tiles || typeof data.tiles !== 'object') {
    return fail('Missing required field: tiles')
  }

  const width = data.mapWidth
  const height = data.mapHeight
  if (!Number.isInteger(width) || (width as number) <= 0) {
    return fail('mapWidth must be a positive integer')
  }
  if (!Number.isInteger(height) || (height as number) <= 0) {
    return fail('mapHeight must be a positive integer')
  }

  const ignoredSections: string[] = []
  if (data.civilizations != null) ignoredSections.push('civilizations')
  if (data.settings != null) ignoredSections.push('settings')

  const now = isoNow()
  const cities = (data.cities ?? []).map(cityToTemplate)
  const draft: MapTemplate = {
    id: newEntityId('map'),
    name: (options?.name ?? 'Imported Map').trim() || 'Imported Map',
    description: (options?.description ?? 'Imported from version-1 JSON').trim(),
    version: 1,
    width: width as number,
    height: height as number,
    tiles: deepClone(data.tiles),
    cities: deepClone(cities),
    createdAt: now,
    updatedAt: now,
  }

  for (const tile of Object.values(draft.tiles)) {
    tile.ownerCivId = null
  }

  const validated = validateMapTemplate(draft)
  if (!validated.ok) return fail(validated.errors)
  return ok({ map: validated.value, ignoredSections })
}

export function parseLegacyV1MapJson(
  text: string,
  options?: { name?: string; description?: string },
): ConversionResult<MapImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return fail('Malformed JSON: could not parse file')
  }
  return legacyV1JsonToMapTemplate(parsed, options)
}

/**
 * Export a MapTemplate as v1-compatible JSON for the legacy editor import path.
 * Catalog-only metadata (description, timestamps, readiness) is omitted.
 */
export function mapTemplateToLegacyV1Json(map: MapTemplate): LegacyMapJsonV1 {
  return {
    version: 1,
    mapWidth: map.width,
    mapHeight: map.height,
    savedAt: isoNow(),
    tiles: deepClone(map.tiles),
    cities: map.cities.map(templateCityToLegacy),
  }
}

export function mapTemplateToLegacyV1JsonString(map: MapTemplate): string {
  return JSON.stringify(mapTemplateToLegacyV1Json(map), null, 2)
}

export function downloadTextFile(filename: string, contents: string, mime = 'application/json') {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function safeDownloadBasename(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_').trim() || 'map'
}
