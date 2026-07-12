import { neighbors, tileKey } from '../game/hexGrid'
import { clearRiverEdgesOnTile, cloneTiles, isWaterTerrain } from '../game/mapLayers/clone'
import { resourceValidOnTile, vegetationCompatible } from '../game/mapLayers/layerValidation'
import type { ResourceType, TerrainType, Tile, VegetationType } from '../game/types'

export type DebugTool =
  | 'terrain'
  | 'features'
  | 'hills'
  | 'mountains'
  | 'rivers'
  | 'resources'
  | 'clear'

export type DebugInteractionMode = 'inspect' | 'edit'

export interface DebugToolSettings {
  terrain: TerrainType
  feature: VegetationType
  resource: ResourceType
  /** For hills/mountains: force on, force off, or toggle from click. */
  elevationAction: 'toggle' | 'add' | 'remove'
  /** For rivers: add if missing, remove if present (toggle). */
  riverAction: 'toggle'
}

export const DEFAULT_DEBUG_TOOL_SETTINGS: DebugToolSettings = {
  terrain: 'grassland',
  feature: 'forest',
  resource: 'wheat',
  elevationAction: 'toggle',
  riverAction: 'toggle',
}

export type DebugEditErrorCode =
  | 'missing-tile'
  | 'city-on-water'
  | 'invalid-feature'
  | 'invalid-resource'
  | 'invalid-hills'
  | 'invalid-mountains'
  | 'river-no-neighbor'
  | 'noop'

export interface DebugEditRequest {
  tool: DebugTool
  tileKey: string
  settings: DebugToolSettings
  /** Required for river tool — visual edge index from MapCanvas (0–5). */
  riverEdgeIndex?: number
}

export interface DebugEditResult {
  ok: boolean
  error?: DebugEditErrorCode
  message?: string
  tiles?: Record<string, Tile>
  /** Keys whose tile content changed (including neighbors for rivers/clear). */
  changedKeys?: string[]
}

function tileHasCity(tile: Tile): boolean {
  return Boolean(tile.cityId)
}

function sanitizeAfterTerrainChange(tile: Tile): Tile {
  let next: Tile = { ...tile, riverDirections: [...tile.riverDirections] }
  if (isWaterTerrain(next.terrain) || next.terrain === 'mountains') {
    next = { ...next, hasHills: false, vegetation: 'none' }
  }
  if (next.terrain === 'mountains') {
    next = { ...next, hasHills: false }
  }
  if (!vegetationCompatible(next)) {
    next = { ...next, vegetation: 'none' }
  }
  if (next.resource !== 'none' && !resourceValidOnTile(next)) {
    next = { ...next, resource: 'none' }
  }
  return next
}

/**
 * Pure single-tile (plus river neighbor) debug edit for Active Game session tiles.
 * Never mutates the input `tiles` record.
 */
export function applyDebugEdit(
  tiles: Record<string, Tile>,
  request: DebugEditRequest,
): DebugEditResult {
  const key = request.tileKey
  const source = tiles[key]
  if (!source) {
    return { ok: false, error: 'missing-tile', message: 'Tile not found' }
  }

  const nextTiles = cloneTiles(tiles)
  const tile = nextTiles[key]
  const changed = new Set<string>()

  switch (request.tool) {
    case 'terrain': {
      if (tileHasCity(tile) && isWaterTerrain(request.settings.terrain)) {
        return {
          ok: false,
          error: 'city-on-water',
          message: 'Cannot place water under a city',
        }
      }
      if (tile.terrain === request.settings.terrain) {
        return { ok: false, error: 'noop', message: 'Terrain unchanged' }
      }
      nextTiles[key] = sanitizeAfterTerrainChange({
        ...tile,
        terrain: request.settings.terrain,
      })
      changed.add(key)
      break
    }

    case 'features': {
      const candidate = { ...tile, vegetation: request.settings.feature }
      if (!vegetationCompatible(candidate)) {
        return {
          ok: false,
          error: 'invalid-feature',
          message: 'Feature not valid on this terrain',
        }
      }
      if (tile.vegetation === request.settings.feature) {
        return { ok: false, error: 'noop', message: 'Feature unchanged' }
      }
      let updated = { ...candidate, riverDirections: [...tile.riverDirections] }
      if (updated.resource !== 'none' && !resourceValidOnTile(updated)) {
        updated = { ...updated, resource: 'none' }
      }
      nextTiles[key] = updated
      changed.add(key)
      break
    }

    case 'hills': {
      if (isWaterTerrain(tile.terrain) || tile.terrain === 'mountains') {
        return {
          ok: false,
          error: 'invalid-hills',
          message: 'Hills not allowed on water or mountains',
        }
      }
      const want =
        request.settings.elevationAction === 'add'
          ? true
          : request.settings.elevationAction === 'remove'
            ? false
            : !tile.hasHills
      if (tile.hasHills === want) {
        return { ok: false, error: 'noop', message: 'Hills unchanged' }
      }
      nextTiles[key] = { ...tile, hasHills: want, riverDirections: [...tile.riverDirections] }
      changed.add(key)
      break
    }

    case 'mountains': {
      if (tileHasCity(tile)) {
        // Changing city tile to mountains is allowed only if not water; mountains are land.
        // Removing mountains under a city is fine. Adding mountains under city is OK for debug.
      }
      const wantMountains =
        request.settings.elevationAction === 'add'
          ? true
          : request.settings.elevationAction === 'remove'
            ? false
            : tile.terrain !== 'mountains'

      if (wantMountains) {
        if (tile.terrain === 'mountains') {
          return { ok: false, error: 'noop', message: 'Already mountains' }
        }
        nextTiles[key] = sanitizeAfterTerrainChange({
          ...tile,
          terrain: 'mountains',
          hasHills: false,
        })
      } else {
        if (tile.terrain !== 'mountains') {
          return { ok: false, error: 'noop', message: 'Not mountains' }
        }
        nextTiles[key] = sanitizeAfterTerrainChange({
          ...tile,
          terrain: 'plains',
          hasHills: false,
        })
      }
      changed.add(key)
      break
    }

    case 'rivers': {
      if (request.riverEdgeIndex == null || request.riverEdgeIndex < 0 || request.riverEdgeIndex > 5) {
        return { ok: false, error: 'noop', message: 'River edge required' }
      }
      // Match World Editor: visual edgeIndex → storage dir
      const dir = (6 - request.riverEdgeIndex) % 6
      const neighborCoord = neighbors(tile.coord)[dir]
      const neighborKey = tileKey(neighborCoord)
      const neighbor = nextTiles[neighborKey]
      if (!neighbor) {
        return {
          ok: false,
          error: 'river-no-neighbor',
          message: 'No adjacent tile for this river edge',
        }
      }
      const hasEdge = tile.riverDirections.includes(dir)
      const mirrorDir = (dir + 3) % 6
      nextTiles[key] = {
        ...tile,
        riverDirections: hasEdge
          ? tile.riverDirections.filter((d) => d !== dir)
          : [...tile.riverDirections, dir],
      }
      nextTiles[neighborKey] = {
        ...neighbor,
        riverDirections: hasEdge
          ? neighbor.riverDirections.filter((d) => d !== mirrorDir)
          : neighbor.riverDirections.includes(mirrorDir)
            ? [...neighbor.riverDirections]
            : [...neighbor.riverDirections, mirrorDir],
      }
      // Clear invalid resources after river change
      for (const k of [key, neighborKey]) {
        const t = nextTiles[k]
        if (t.resource !== 'none' && !resourceValidOnTile(t)) {
          nextTiles[k] = { ...t, resource: 'none', riverDirections: [...t.riverDirections] }
        }
      }
      changed.add(key)
      changed.add(neighborKey)
      break
    }

    case 'resources': {
      const candidate = {
        ...tile,
        resource: request.settings.resource,
        riverDirections: [...tile.riverDirections],
      }
      if (candidate.resource !== 'none' && !resourceValidOnTile(candidate)) {
        return {
          ok: false,
          error: 'invalid-resource',
          message: 'Resource not valid on this tile',
        }
      }
      if (tile.resource === request.settings.resource) {
        return { ok: false, error: 'noop', message: 'Resource unchanged' }
      }
      nextTiles[key] = candidate
      changed.add(key)
      break
    }

    case 'clear': {
      // Preserve terrain + cityId; clear extras and mirrored rivers
      const before = JSON.stringify({
        v: tile.vegetation,
        h: tile.hasHills,
        r: tile.riverDirections,
        res: tile.resource,
        o: tile.ownerCivId,
      })
      clearRiverEdgesOnTile(nextTiles, key)
      const cleared = nextTiles[key]
      nextTiles[key] = {
        ...cleared,
        vegetation: 'none',
        hasHills: false,
        riverDirections: [],
        resource: 'none',
        ownerCivId: null,
        // cityId and terrain preserved
      }
      const after = JSON.stringify({
        v: nextTiles[key].vegetation,
        h: nextTiles[key].hasHills,
        r: nextTiles[key].riverDirections,
        res: nextTiles[key].resource,
        o: nextTiles[key].ownerCivId,
      })
      if (before === after) {
        return { ok: false, error: 'noop', message: 'Nothing to clear' }
      }
      changed.add(key)
      // Neighbors may have lost mirrored edges
      for (const n of neighbors(tile.coord)) {
        const nk = tileKey(n)
        if (nextTiles[nk] && tiles[nk]) {
          const a = tiles[nk].riverDirections.join(',')
          const b = nextTiles[nk].riverDirections.join(',')
          if (a !== b) changed.add(nk)
        }
      }
      break
    }

    default:
      return { ok: false, error: 'noop', message: 'Unknown tool' }
  }

  return {
    ok: true,
    tiles: nextTiles,
    changedKeys: [...changed],
  }
}

/** Convert MapCanvas visual edge index helpers for tests. */
export function riverStorageDirFromEdgeIndex(edgeIndex: number): number {
  return (6 - edgeIndex) % 6
}
