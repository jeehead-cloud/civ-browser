import { neighbors, tileKey } from '../game/hexGrid'
import type { AxialCoord, Tile } from '../game/types'

export interface FreshWaterInfo {
  riverOnTile: boolean
  riverNearby: boolean
  adjacentLake: boolean
  freshWater: boolean
}

/**
 * Fresh water (PRODUCT_RULES / F11):
 * true when the tile has a river edge, or an adjacent tile is a lake.
 * Rivers are edge properties (`riverDirections`), not terrain.
 */
export function analyzeFreshWater(
  tiles: Record<string, Tile>,
  coord: AxialCoord,
): FreshWaterInfo {
  const tile = tiles[tileKey(coord)]
  const riverOnTile = Boolean(tile && tile.riverDirections.length > 0)

  let riverNearby = false
  let adjacentLake = false
  for (const n of neighbors(coord)) {
    const neighbor = tiles[tileKey(n)]
    if (!neighbor) continue
    if (neighbor.riverDirections.length > 0) riverNearby = true
    if (neighbor.terrain === 'lake') adjacentLake = true
  }

  return {
    riverOnTile,
    riverNearby,
    adjacentLake,
    freshWater: riverOnTile || adjacentLake,
  }
}
