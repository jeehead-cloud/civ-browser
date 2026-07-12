import type { Tile } from '../game/types'
import { generateMapCoords, tileKey } from '../game/hexGrid'
import type { MapTemplate } from '../domain/maps'
import { deepClone } from '../domain/adapters'

/** Soft limits aligned with current MVP map size and browser performance. */
export const CATALOG_MAP_MIN_SIZE = 16
export const CATALOG_MAP_MAX_WIDTH = 250
export const CATALOG_MAP_MAX_HEIGHT = 135
export const CATALOG_MAP_DEFAULT_WIDTH = 80
export const CATALOG_MAP_DEFAULT_HEIGHT = 45

export type MapReadiness = 'blank' | 'draft' | 'ready'

export function newEntityId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function isoNow(): string {
  return new Date().toISOString()
}

/** Deterministic all-ocean base — simplest safe blank map for Create. */
export function createBlankOceanTiles(width: number, height: number): Record<string, Tile> {
  const tiles: Record<string, Tile> = {}
  for (const coord of generateMapCoords(width, height)) {
    tiles[tileKey(coord)] = {
      coord: { ...coord },
      terrain: 'ocean',
      vegetation: 'none',
      resource: 'none',
      ownerCivId: null,
      cityId: null,
      hasHills: false,
      riverDirections: [],
    }
  }
  return tiles
}

export function createBlankMapTemplate(input: {
  name: string
  description?: string
  width: number
  height: number
}): MapTemplate {
  const now = isoNow()
  return {
    id: newEntityId('map'),
    name: input.name.trim(),
    description: (input.description ?? '').trim(),
    version: 1,
    width: input.width,
    height: input.height,
    tiles: createBlankOceanTiles(input.width, input.height),
    cities: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function duplicateMapTemplate(source: MapTemplate): MapTemplate {
  const copy = deepClone(source)
  const now = isoNow()
  copy.id = newEntityId('map')
  copy.name = `${source.name} Copy`
  copy.createdAt = now
  copy.updatedAt = now
  return copy
}

export function mapReadiness(map: MapTemplate): MapReadiness {
  const hasLand = Object.values(map.tiles).some(
    (t) => t.terrain !== 'ocean' && t.terrain !== 'coast' && t.terrain !== 'lake',
  )
  if (map.cities.length > 0) return 'ready'
  if (hasLand) return 'draft'
  return 'blank'
}

export function validateMapDimensions(width: number, height: number): string[] {
  const errors: string[] = []
  if (!Number.isInteger(width) || width < CATALOG_MAP_MIN_SIZE || width > CATALOG_MAP_MAX_WIDTH) {
    errors.push(`Width must be an integer from ${CATALOG_MAP_MIN_SIZE} to ${CATALOG_MAP_MAX_WIDTH}`)
  }
  if (!Number.isInteger(height) || height < CATALOG_MAP_MIN_SIZE || height > CATALOG_MAP_MAX_HEIGHT) {
    errors.push(`Height must be an integer from ${CATALOG_MAP_MIN_SIZE} to ${CATALOG_MAP_MAX_HEIGHT}`)
  }
  return errors
}

export function filterMapsByQuery(maps: MapTemplate[], query: string): MapTemplate[] {
  const q = query.trim().toLowerCase()
  if (!q) return maps
  return maps.filter(
    (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
  )
}
