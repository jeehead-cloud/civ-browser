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
 * Load a catalog MapTemplate into the legacy Zustand editor.
 * Does not write back to MapRepository (F5). Civilizations/settings stay as current editor state.
 */
export function loadMapTemplateIntoEditor(map: MapTemplate): void {
  const payload = mapTemplateToEditorPayload(map)
  useGameStore.getState().loadCatalogMapBridge(payload)
  writeCatalogBridgeMeta({
    mapId: map.id,
    mapName: map.name,
    loadedAt: new Date().toISOString(),
  })
}
