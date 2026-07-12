import { Tile } from '../types'
import { RESOURCE_RULES, tileMatchesRule } from '../resourceData'
import { cloneTiles, isWaterTerrain } from './clone'
import { mulberry32 } from './rng'
import {
  emptyResult,
  LayerMapContext,
  LayerOpResult,
  ResourceDensity,
  successResult,
} from './types'

const DENSITY_MULT: Record<ResourceDensity, number> = {
  sparse: 0.55,
  standard: 1,
  rich: 1.75,
}

const LAND_BASE = 0.05
const WATER_BASE = 0.012

export function clearAllResources(tiles: Record<string, Tile>): LayerOpResult {
  const next = cloneTiles(tiles)
  let tilesChanged = 0
  for (const key in next) {
    if (next[key].resource !== 'none') {
      next[key].resource = 'none'
      tilesChanged++
    }
  }
  if (tilesChanged === 0) return emptyResult('No resources to clear')
  return successResult(next, tilesChanged, `Cleared resources on ${tilesChanged} tiles`)
}

/**
 * Replace resource layer only using existing RESOURCE_RULES.
 * Density is a generation multiplier, not per-tile quantity.
 */
export function generateResources(
  tiles: Record<string, Tile>,
  ctx: LayerMapContext & { density?: ResourceDensity },
): LayerOpResult {
  const seed = ctx.seed ?? Date.now()
  const density = ctx.density ?? 'standard'
  const mult = DENSITY_MULT[density]
  const rand = mulberry32(seed)
  const next = cloneTiles(tiles)

  // Clear existing resources first (resource-layer only)
  for (const key in next) {
    next[key].resource = 'none'
  }

  function weightFor(tile: Tile, rule: (typeof RESOURCE_RULES)[number]): number {
    let w = rule.chance
    if (rule.boostTerrains?.includes(tile.terrain) && rule.boostMultiplier) {
      w *= rule.boostMultiplier
    }
    return w
  }

  let placed = 0
  for (const key in next) {
    const tile = next[key]
    if (tile.cityId) continue

    const isWater = isWaterTerrain(tile.terrain)
    const base = (isWater ? WATER_BASE : LAND_BASE) * mult
    if (rand() > base) continue

    const hasRiver = tile.riverDirections.length > 0
    const matching = RESOURCE_RULES.filter((rule) =>
      tileMatchesRule(tile.terrain, tile.vegetation, tile.hasHills, hasRiver, rule),
    )
    if (matching.length === 0) continue

    const weights = matching.map((r) => weightFor(tile, r))
    const total = weights.reduce((a, b) => a + b, 0)
    let roll = rand() * total
    let picked = matching[0]
    for (let i = 0; i < matching.length; i++) {
      roll -= weights[i]
      if (roll <= 0) {
        picked = matching[i]
        break
      }
    }
    tile.resource = picked.id
    placed++
  }

  let tilesChanged = 0
  for (const key in next) {
    if (next[key].resource !== tiles[key].resource) tilesChanged++
  }

  if (tilesChanged === 0) {
    return emptyResult('Resource generation produced no changes')
  }

  return successResult(
    next,
    tilesChanged,
    `Resources randomized (${placed} placements, density=${density}).`,
    [],
    { seed, placed, density },
  )
}

export { DENSITY_MULT }
