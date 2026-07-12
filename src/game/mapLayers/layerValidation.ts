import { Tile } from '../types'
import { neighbors, tileKey } from '../hexGrid'
import { RESOURCE_RULES, tileMatchesRule } from '../resourceData'
import { isWaterTerrain } from './clone'

export function resourceValidOnTile(tile: Tile): boolean {
  if (tile.resource === 'none') return true
  const hasRiver = tile.riverDirections.length > 0
  return RESOURCE_RULES.some((rule) =>
    rule.id === tile.resource &&
    tileMatchesRule(tile.terrain, tile.vegetation, tile.hasHills, hasRiver, rule),
  )
}

export function clearInvalidResource(tile: Tile): boolean {
  if (tile.resource === 'none') return false
  if (resourceValidOnTile(tile)) return false
  tile.resource = 'none'
  return true
}

export function vegetationCompatible(tile: Tile): boolean {
  if (tile.vegetation === 'none') return true
  if (isWaterTerrain(tile.terrain) || tile.terrain === 'mountains') return false
  if (tile.vegetation === 'swamp') {
    return tile.terrain === 'grassland' || tile.terrain === 'plains'
  }
  if (tile.vegetation === 'jungle') {
    return tile.terrain === 'grassland' || tile.terrain === 'plains'
  }
  if (tile.vegetation === 'forest') {
    return (
      tile.terrain === 'grassland' ||
      tile.terrain === 'plains' ||
      tile.terrain === 'tundra' ||
      tile.terrain === 'desert'
    )
  }
  return true
}

/** Assert all river edges are mirrored. Returns list of violation keys. */
export function findUnmirroredRiverEdges(tiles: Record<string, Tile>): string[] {
  const bad: string[] = []
  for (const key in tiles) {
    const tile = tiles[key]
    for (const dir of tile.riverDirections) {
      const n = neighbors(tile.coord)[dir]
      const nKey = tileKey(n)
      const neighbor = tiles[nKey]
      if (!neighbor) {
        bad.push(`${key}->out`)
        continue
      }
      const mirror = (dir + 3) % 6
      if (!neighbor.riverDirections.includes(mirror)) {
        bad.push(`${key}->${nKey}`)
      }
    }
  }
  return bad
}

export function assertNoMountainHills(tiles: Record<string, Tile>): string[] {
  const bad: string[] = []
  for (const key in tiles) {
    const t = tiles[key]
    if (t.terrain === 'mountains' && t.hasHills) bad.push(key)
  }
  return bad
}

export function countKeys(tiles: Record<string, Tile>): number {
  return Object.keys(tiles).length
}
