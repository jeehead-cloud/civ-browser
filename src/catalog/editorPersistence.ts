import type { City, Tile } from '../game/types'
import type { MapTemplate } from '../domain/maps'
import { deepClone, legacyMapToMapTemplate } from '../domain/adapters'
import type { ConversionResult } from '../domain/result'
import { validateMapTemplate } from '../domain/validators'
import { newEntityId } from './mapFactory'
import {
  mapTemplateCitiesToLegacy,
  mapTemplateToEditorPayload,
} from './editorBridgeCore'
import { catalogErrorMessage, getCatalogPersistence } from './persistence'
import type { PersistenceServices } from '../persistence'

export interface CatalogEditorMeta {
  id: string
  name: string
  description: string
  version: number
  createdAt: string
  width: number
  height: number
  updatedAt: string
}

export interface LegacyEditorMapSnapshot {
  tiles: Record<string, Tile>
  cities: City[]
  width: number
  height: number
}

/** Convert catalog MapTemplate → legacy editor payload (deep-cloned). */
export function catalogMapToLegacyEditorState(map: MapTemplate) {
  return mapTemplateToEditorPayload(map)
}

/**
 * Convert current legacy editor map content back into a MapTemplate for catalog save.
 * Preserves id / version / createdAt from catalog meta; refreshes updatedAt.
 */
export function legacyEditorToMapTemplate(
  snapshot: LegacyEditorMapSnapshot,
  meta: {
    id: string
    name: string
    description: string
    version: number
    createdAt: string
  },
): ConversionResult<MapTemplate> {
  const now = new Date().toISOString()
  return legacyMapToMapTemplate({
    id: meta.id,
    name: meta.name,
    description: meta.description,
    version: meta.version,
    createdAt: meta.createdAt,
    updatedAt: now,
    width: snapshot.width,
    height: snapshot.height,
    tiles: snapshot.tiles,
    cities: snapshot.cities,
  })
}

/** Build an independent Save As copy from current editor content. */
export function legacyEditorToMapTemplateSaveAs(
  snapshot: LegacyEditorMapSnapshot,
  meta: { name: string; description: string },
): ConversionResult<MapTemplate> {
  const now = new Date().toISOString()
  return legacyMapToMapTemplate({
    id: newEntityId('map'),
    name: meta.name.trim() || 'Untitled Map',
    description: meta.description,
    version: 1,
    createdAt: now,
    updatedAt: now,
    width: snapshot.width,
    height: snapshot.height,
    tiles: snapshot.tiles,
    cities: snapshot.cities,
  })
}

export async function loadCatalogMapById(
  mapId: string,
  services?: PersistenceServices,
): Promise<MapTemplate | null> {
  const persistence = services ?? (await getCatalogPersistence())
  return persistence.maps.get(mapId)
}

export async function saveMapTemplateToCatalog(
  map: MapTemplate,
  services?: PersistenceServices,
): Promise<MapTemplate> {
  const validated = validateMapTemplate(map)
  if (!validated.ok) {
    throw new Error(validated.errors.join('; '))
  }
  const persistence = services ?? (await getCatalogPersistence())
  // Clone so repository input is not the live editor reference.
  const toSave = deepClone(validated.value)
  await persistence.maps.save(toSave)
  const stored = await persistence.maps.get(toSave.id)
  if (!stored) throw new Error('Save succeeded but map could not be reloaded')
  return stored
}

export function editorPersistenceErrorMessage(error: unknown, fallback: string): string {
  return catalogErrorMessage(error, fallback)
}

/** Re-export for callers that need city conversion without Zustand. */
export { mapTemplateCitiesToLegacy }
