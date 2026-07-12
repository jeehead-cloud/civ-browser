import { AxialCoord, Tile } from '../types'
import { neighbors, tileKey } from '../hexGrid'

/** Shallow-clone every tile; riverDirections arrays are copied. */
export function cloneTiles(tiles: Record<string, Tile>): Record<string, Tile> {
  const out: Record<string, Tile> = {}
  for (const key in tiles) {
    const t = tiles[key]
    out[key] = {
      ...t,
      coord: { q: t.coord.q, r: t.coord.r },
      riverDirections: t.riverDirections.slice(),
    }
  }
  return out
}

export function buildCoordsByKey(tiles: Record<string, Tile>): Map<string, AxialCoord> {
  const map = new Map<string, AxialCoord>()
  for (const key in tiles) {
    map.set(key, tiles[key].coord)
  }
  return map
}

export function isWaterTerrain(terrain: Tile['terrain']): boolean {
  return terrain === 'ocean' || terrain === 'coast' || terrain === 'lake'
}

export function isLandTerrain(terrain: Tile['terrain']): boolean {
  return !isWaterTerrain(terrain)
}

/** Clear river edges on a tile and mirrored edges on neighbors (mutates `tiles`). */
export function clearRiverEdgesOnTile(tiles: Record<string, Tile>, key: string): number {
  const tile = tiles[key]
  if (!tile || tile.riverDirections.length === 0) return 0
  let cleared = 0
  for (const dir of tile.riverDirections) {
    const neighborCoord = neighbors(tile.coord)[dir]
    const neighborKey = tileKey(neighborCoord)
    const neighbor = tiles[neighborKey]
    if (neighbor) {
      const mirrorDir = (dir + 3) % 6
      const before = neighbor.riverDirections.length
      neighbor.riverDirections = neighbor.riverDirections.filter((d) => d !== mirrorDir)
      cleared += before - neighbor.riverDirections.length
    }
  }
  cleared += tile.riverDirections.length
  tile.riverDirections = []
  return cleared
}

/** Add a mirrored river edge between two adjacent in-map tiles. Returns edges added (0–2). */
export function addMirroredRiverEdge(
  tiles: Record<string, Tile>,
  fromKey: string,
  toKey: string,
  dirFrom: number,
): number {
  const from = tiles[fromKey]
  const to = tiles[toKey]
  if (!from || !to) return 0
  let added = 0
  const mirror = (dirFrom + 3) % 6
  if (!from.riverDirections.includes(dirFrom)) {
    from.riverDirections = [...from.riverDirections, dirFrom]
    added++
  }
  if (!to.riverDirections.includes(mirror)) {
    to.riverDirections = [...to.riverDirections, mirror]
    added++
  }
  return added
}

export function directionIndex(from: AxialCoord, to: AxialCoord): number {
  const DIRS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]
  for (let i = 0; i < 6; i++) {
    if (from.q + DIRS[i].q === to.q && from.r + DIRS[i].r === to.r) return i
  }
  return -1
}
