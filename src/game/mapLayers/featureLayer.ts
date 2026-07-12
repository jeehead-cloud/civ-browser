import { Tile } from '../types'
import { neighbors, tileKey } from '../hexGrid'
import { RESOURCE_RULES, tileMatchesRule } from '../resourceData'
import { cloneTiles, isWaterTerrain } from './clone'
import { mulberry32 } from './rng'
import { emptyResult, LayerMapContext, LayerOpResult, successResult } from './types'

function latitudeFactor(r: number, height: number): number {
  const mid = (height - 1) / 2
  return Math.min(1, Math.abs(r - mid) / Math.max(1, mid))
}

function wouldInvalidateResource(tile: Tile, vegetation: Tile['vegetation']): boolean {
  if (tile.resource === 'none') return false
  const hasRiver = tile.riverDirections.length > 0
  return !RESOURCE_RULES.some(
    (rule) =>
      rule.id === tile.resource &&
      tileMatchesRule(tile.terrain, vegetation, tile.hasHills, hasRiver, rule),
  )
}

export function clearAllFeatures(tiles: Record<string, Tile>): LayerOpResult {
  const next = cloneTiles(tiles)
  let tilesChanged = 0
  for (const key in next) {
    if (next[key].vegetation !== 'none') {
      next[key].vegetation = 'none'
      tilesChanged++
    }
  }
  if (tilesChanged === 0) return emptyResult('No features to clear')
  return successResult(next, tilesChanged, `Cleared features on ${tilesChanged} tiles`)
}

/**
 * Randomize vegetation using current terrain/rivers.
 * Prefer skipping placement when it would invalidate an existing resource.
 */
export function generateFeatures(
  tiles: Record<string, Tile>,
  ctx: LayerMapContext,
): LayerOpResult {
  const seed = ctx.seed ?? Date.now()
  const rand = mulberry32(seed)
  const next = cloneTiles(tiles)
  let placed = 0
  let skippedForResource = 0

  for (const key in next) {
    next[key].vegetation = 'none'
  }

  const moistureProxy = new Map<string, number>()
  for (const key in next) moistureProxy.set(key, rand())

  for (const key in next) {
    const tile = next[key]
    if (isWaterTerrain(tile.terrain) || tile.terrain === 'mountains') continue

    const lat = latitudeFactor(tile.coord.r, ctx.height)
    let candidate: Tile['vegetation'] = 'none'

    if (tile.terrain === 'tundra') {
      if (rand() < 0.35) candidate = 'forest'
    } else if (tile.terrain === 'plains' || tile.terrain === 'grassland') {
      if (lat <= 0.18) {
        if (tile.terrain === 'grassland' && rand() < 0.45) candidate = 'jungle'
        else if (tile.terrain === 'plains' && rand() < 0.22) candidate = 'jungle'
      } else if (lat > 0.15 && lat <= 0.42) {
        if (rand() < 0.05) candidate = 'forest'
      } else if (rand() < 0.22) {
        candidate = 'forest'
      }

      if (
        candidate === 'none' &&
        tile.riverDirections.length > 0 &&
        (tile.terrain === 'grassland' || tile.terrain === 'plains')
      ) {
        const nearCoast = neighbors(tile.coord).some((n) => {
          const nt = next[tileKey(n)]
          return nt && (nt.terrain === 'coast' || nt.terrain === 'lake')
        })
        const moisture = moistureProxy.get(key) ?? 0
        if (nearCoast && moisture > 0.55 && rand() < 0.35) candidate = 'swamp'
      }
    } else if (tile.terrain === 'desert' && rand() < 0.03) {
      candidate = 'forest'
    }

    if (candidate === 'none') continue
    if (wouldInvalidateResource(tile, candidate)) {
      skippedForResource++
      continue
    }
    tile.vegetation = candidate
    placed++
  }

  let tilesChanged = 0
  for (const key in next) {
    if (next[key].vegetation !== tiles[key].vegetation) tilesChanged++
  }

  if (tilesChanged === 0) {
    return emptyResult('Feature generation produced no changes')
  }

  return successResult(
    next,
    tilesChanged,
    `Features updated on ${tilesChanged} tiles (${placed} placements).`,
    skippedForResource > 0
      ? [`Skipped ${skippedForResource} tiles to preserve existing resources`]
      : [],
    { seed, placed, skippedForResource },
  )
}
