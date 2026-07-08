import { ResourceType, TerrainType, VegetationType } from './types'

export type ResourceCategory = 'bonus' | 'luxury' | 'strategic'

export interface ResourceRule {
  id: ResourceType
  category: ResourceCategory
  terrains: TerrainType[]
  vegetation?: VegetationType | 'any'
  hills?: 'required' | 'excluded' | 'any'
  requiresRiver?: boolean
  chance: number
  boostTerrains?: TerrainType[]
  boostMultiplier?: number
}

// "terrains" = where a resource can appear in principle.
// "vegetation" = required vegetation on the tile ('none' means bare land, no forest/jungle/swamp).
// "hills" = 'required' (must have hills), 'excluded' (must not), or 'any' (doesn't matter).
// "boostTerrains"/"boostMultiplier" = where the resource is noticeably more common.
export const RESOURCE_RULES: ResourceRule[] = [
  // --- Bonus (visible without tech, growth resources) ---
  { id: 'wheat', category: 'bonus', terrains: ['grassland', 'plains'], vegetation: 'none', hills: 'any', chance: 0.08 },
  { id: 'deer', category: 'bonus', terrains: ['plains', 'grassland', 'tundra'], vegetation: 'forest', chance: 0.10 },
  { id: 'fish', category: 'bonus', terrains: ['coast', 'lake'], vegetation: 'any', chance: 0.12 },
  { id: 'bananas', category: 'bonus', terrains: ['plains', 'grassland'], vegetation: 'jungle', chance: 0.12 },
  { id: 'stone', category: 'bonus', terrains: ['grassland', 'plains', 'tundra', 'desert', 'snow'], vegetation: 'none', hills: 'required', chance: 0.10 },

  // --- Luxury (need an improvement, give happiness/gold) ---
  { id: 'gold', category: 'luxury', terrains: ['desert', 'tundra', 'plains', 'grassland', 'snow'], hills: 'required', chance: 0.06, boostTerrains: ['desert'], boostMultiplier: 1.5 },
  { id: 'silver', category: 'luxury', terrains: ['tundra', 'snow'], hills: 'required', chance: 0.07 },
  { id: 'gems', category: 'luxury', terrains: ['grassland', 'plains', 'desert'], vegetation: 'jungle', chance: 0.08 },
  { id: 'marble', category: 'luxury', terrains: ['grassland', 'plains', 'desert'], hills: 'any', vegetation: 'none', chance: 0.05 },
  { id: 'ivory', category: 'luxury', terrains: ['plains', 'desert'], vegetation: 'none', chance: 0.04 },
  { id: 'furs', category: 'luxury', terrains: ['tundra', 'snow'], vegetation: 'forest', chance: 0.10 },
  { id: 'cotton', category: 'luxury', terrains: ['plains', 'desert'], vegetation: 'none', requiresRiver: true, chance: 0.12 },
  { id: 'dyes', category: 'luxury', terrains: ['plains', 'grassland'], vegetation: 'jungle', chance: 0.06 },
  { id: 'incense', category: 'luxury', terrains: ['desert'], vegetation: 'none', chance: 0.07 },
  { id: 'wine', category: 'luxury', terrains: ['grassland', 'plains'], vegetation: 'none', hills: 'any', chance: 0.06 },
  { id: 'sugar', category: 'luxury', terrains: ['plains', 'grassland'], vegetation: 'jungle', requiresRiver: true, chance: 0.10 },
  { id: 'spices', category: 'luxury', terrains: ['plains', 'grassland'], vegetation: 'jungle', chance: 0.06 },
  { id: 'citrus', category: 'luxury', terrains: ['plains', 'grassland'], vegetation: 'jungle', chance: 0.05 },
  { id: 'silk', category: 'luxury', terrains: ['grassland', 'plains', 'tundra'], vegetation: 'forest', chance: 0.06 },
  { id: 'truffles', category: 'luxury', terrains: ['grassland', 'plains'], vegetation: 'forest', chance: 0.05 },
  { id: 'whales', category: 'luxury', terrains: ['ocean', 'coast'], chance: 0.03 },
  { id: 'pearls', category: 'luxury', terrains: ['coast'], chance: 0.05 },
  { id: 'coral', category: 'luxury', terrains: ['coast'], chance: 0.05 },
  { id: 'salt', category: 'luxury', terrains: ['desert', 'tundra'], vegetation: 'none', chance: 0.06 },
  { id: 'amber', category: 'luxury', terrains: ['tundra'], vegetation: 'forest', chance: 0.05 },

  // --- Strategic (will be gated by tech tree later — no era attached yet) ---
  { id: 'horses', category: 'strategic', terrains: ['plains', 'grassland'], vegetation: 'none', chance: 0.08 },
  { id: 'iron', category: 'strategic', terrains: ['grassland', 'plains', 'tundra', 'desert', 'snow'], hills: 'required', chance: 0.08 },
  { id: 'niter', category: 'strategic', terrains: ['plains', 'grassland', 'desert', 'tundra'], vegetation: 'none', chance: 0.05 },
  { id: 'coal', category: 'strategic', terrains: ['grassland', 'plains', 'tundra'], vegetation: 'forest', hills: 'any', chance: 0.07 },
  { id: 'oil', category: 'strategic', terrains: ['desert', 'tundra', 'plains', 'grassland', 'coast'], vegetation: 'any', chance: 0.03, boostTerrains: ['desert', 'tundra'], boostMultiplier: 2.5 },
  { id: 'aluminum', category: 'strategic', terrains: ['desert', 'tundra', 'snow'], hills: 'any', chance: 0.04 },
  { id: 'uranium', category: 'strategic', terrains: ['desert', 'tundra', 'grassland', 'plains'], vegetation: 'any', chance: 0.02 },
  { id: 'rareEarths', category: 'strategic', terrains: ['desert', 'tundra'], hills: 'any', chance: 0.02 },
  { id: 'lithium', category: 'strategic', terrains: ['desert'], vegetation: 'none', chance: 0.025 },
  { id: 'naturalGas', category: 'strategic', terrains: ['tundra', 'desert', 'coast'], chance: 0.03 },
  { id: 'titanium', category: 'strategic', terrains: ['grassland', 'plains', 'tundra', 'desert', 'snow'], hills: 'required', chance: 0.015 },
]

export function tileMatchesRule(
  terrain: TerrainType,
  vegetation: VegetationType,
  hasHills: boolean,
  hasRiver: boolean,
  rule: ResourceRule,
): boolean {
  if (!rule.terrains.includes(terrain)) return false
  if (rule.vegetation && rule.vegetation !== 'any' && vegetation !== rule.vegetation) return false
  if (rule.hills === 'required' && !hasHills) return false
  if (rule.hills === 'excluded' && hasHills) return false
  if (rule.requiresRiver && !hasRiver) return false
  return true
}
