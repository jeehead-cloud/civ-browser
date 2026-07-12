import type { City, Tile } from '../game/types'
import type { MapTemplate } from '../domain/maps'
import { deepClone } from '../domain/adapters'

export const CATALOG_BRIDGE_STORAGE_KEY = 'civ-browser.catalogBridge'

export interface CatalogBridgeMeta {
  mapId: string
  mapName: string
  loadedAt: string
}

export function readCatalogBridgeMeta(): CatalogBridgeMeta | null {
  try {
    const raw = sessionStorage.getItem(CATALOG_BRIDGE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CatalogBridgeMeta
    if (!parsed?.mapId || !parsed?.mapName) return null
    return parsed
  } catch {
    return null
  }
}

export function writeCatalogBridgeMeta(meta: CatalogBridgeMeta): void {
  sessionStorage.setItem(CATALOG_BRIDGE_STORAGE_KEY, JSON.stringify(meta))
}

export function clearCatalogBridgeMeta(): void {
  sessionStorage.removeItem(CATALOG_BRIDGE_STORAGE_KEY)
}

/** Convert map-template cities into legacy City rows for the temporary editor bridge. */
export function mapTemplateCitiesToLegacy(map: MapTemplate): City[] {
  return map.cities.map((city) => ({
    id: city.id,
    civId: null,
    name: city.name,
    coord: { ...city.coord },
    population: city.startingPopulation,
    productionQueue: [],
    culture: 0,
    isCapital: false,
    growthRateBonus: 0,
  }))
}

/** Pure conversion used by the F4 bridge (and verification without loading Zustand). */
export function mapTemplateToEditorPayload(map: MapTemplate): {
  tiles: Record<string, Tile>
  cities: City[]
  catalogMapId: string
  catalogMapName: string
} {
  return {
    tiles: deepClone(map.tiles),
    cities: mapTemplateCitiesToLegacy(map),
    catalogMapId: map.id,
    catalogMapName: map.name,
  }
}
