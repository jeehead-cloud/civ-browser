import type { MapTemplate } from '../domain/maps'
import { useGameStore } from '../game/store'
import {
  mapTemplateToEditorPayload,
  writeCatalogBridgeMeta,
} from './editorBridgeCore'

export {
  CATALOG_BRIDGE_STORAGE_KEY,
  type CatalogBridgeMeta,
  readCatalogBridgeMeta,
  writeCatalogBridgeMeta,
  clearCatalogBridgeMeta,
  mapTemplateCitiesToLegacy,
  mapTemplateToEditorPayload,
} from './editorBridgeCore'

/**
 * Load a catalog MapTemplate into the legacy Zustand editor for F5 selected-map editing.
 */
export function loadMapTemplateIntoEditor(map: MapTemplate): void {
  const payload = mapTemplateToEditorPayload(map)
  useGameStore.getState().loadSelectedCatalogMap({
    tiles: payload.tiles,
    cities: payload.cities,
    catalogMapId: map.id,
    catalogMapName: map.name,
    catalogMapDescription: map.description,
    catalogMapVersion: map.version,
    catalogMapCreatedAt: map.createdAt,
    width: map.width,
    height: map.height,
    lastSavedAt: map.updatedAt,
  })
  writeCatalogBridgeMeta({
    mapId: map.id,
    mapName: map.name,
    loadedAt: new Date().toISOString(),
  })
}
