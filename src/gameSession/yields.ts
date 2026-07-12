import type { Tile, TerrainType, VegetationType } from '../game/types'

/**
 * Informational base tile yields for Active Game popups (F11).
 * Display-only — does NOT affect city growth or any gameplay formula.
 * Resource bonuses are omitted until PRODUCT_RULES defines them.
 */
export interface TileYields {
  food: number
  production: number
  /** Always planned in F11 — not a stored field. */
  beauty: 'planned'
  /** True when mountains (or similar) have no workable yield. */
  workable: boolean
  label: 'base tile yield'
}

const TERRAIN_BASE: Record<TerrainType, { food: number; production: number; workable: boolean }> = {
  ocean: { food: 1, production: 0, workable: true },
  coast: { food: 1, production: 0, workable: true },
  lake: { food: 2, production: 0, workable: true },
  plains: { food: 1, production: 1, workable: true },
  grassland: { food: 2, production: 0, workable: true },
  mountains: { food: 0, production: 0, workable: false },
  desert: { food: 0, production: 0, workable: true },
  tundra: { food: 1, production: 0, workable: true },
  snow: { food: 0, production: 0, workable: true },
}

const FEATURE_BONUS: Record<Exclude<VegetationType, 'none'>, { food: number; production: number }> = {
  forest: { food: 0, production: 1 },
  jungle: { food: 1, production: 0 },
  swamp: { food: 1, production: 0 },
}

/** Hills add +1 production on workable non-mountain land tiles. */
const HILLS_PRODUCTION = 1

export function calculateTileYields(tile: Tile): TileYields {
  const base = TERRAIN_BASE[tile.terrain] ?? { food: 0, production: 0, workable: true }

  if (!base.workable || tile.terrain === 'mountains') {
    return {
      food: 0,
      production: 0,
      beauty: 'planned',
      workable: false,
      label: 'base tile yield',
    }
  }

  let food = base.food
  let production = base.production

  if (tile.hasHills && tile.terrain !== 'ocean' && tile.terrain !== 'coast' && tile.terrain !== 'lake') {
    production += HILLS_PRODUCTION
  }

  if (tile.vegetation !== 'none') {
    const bonus = FEATURE_BONUS[tile.vegetation]
    food += bonus.food
    production += bonus.production
  }

  return {
    food,
    production,
    beauty: 'planned',
    workable: true,
    label: 'base tile yield',
  }
}

export { TERRAIN_BASE, FEATURE_BONUS, HILLS_PRODUCTION }
