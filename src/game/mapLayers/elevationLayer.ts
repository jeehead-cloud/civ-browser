import { AxialCoord, Tile } from '../types'
import { hexDistance, neighbors, tileKey } from '../hexGrid'
import { clearInvalidResource } from './layerValidation'
import { cloneTiles, isWaterTerrain } from './clone'
import { mulberry32 } from './rng'
import { emptyResult, LayerMapContext, LayerOpResult, successResult } from './types'

function cubeRound(qf: number, rf: number): AxialCoord {
  let x = qf
  let z = rf
  let y = -x - z
  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)
  const xDiff = Math.abs(rx - x)
  const yDiff = Math.abs(ry - y)
  const zDiff = Math.abs(rz - z)
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz
  else if (yDiff > zDiff) ry = -rx - rz
  else rz = -rx - ry
  return { q: rx, r: rz }
}

function hexLine(a: AxialCoord, b: AxialCoord): AxialCoord[] {
  const n = hexDistance(a, b)
  const results: AxialCoord[] = []
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n
    results.push(cubeRound(a.q + (b.q - a.q) * t, a.r + (b.r - a.r) * t))
  }
  return results
}

function canPlaceMountain(tile: Tile): boolean {
  if (tile.cityId) return false
  if (isWaterTerrain(tile.terrain)) return false
  return true
}

function applyMountain(tile: Tile): void {
  tile.terrain = 'mountains'
  tile.hasHills = false
  if (tile.vegetation !== 'none') tile.vegetation = 'none'
  clearInvalidResource(tile)
}

export function clearAllMountainsAndHills(tiles: Record<string, Tile>): LayerOpResult {
  const next = cloneTiles(tiles)
  let tilesChanged = 0
  for (const key in next) {
    const t = next[key]
    let changed = false
    if (t.terrain === 'mountains') {
      t.terrain = 'plains'
      changed = true
    }
    if (t.hasHills) {
      t.hasHills = false
      changed = true
    }
    if (changed) {
      clearInvalidResource(t)
      tilesChanged++
    }
  }
  if (tilesChanged === 0) return emptyResult('No mountains or hills to clear')
  return successResult(
    next,
    tilesChanged,
    `Cleared mountains/hills on ${tilesChanged} tiles (mountains → plains).`,
  )
}

export function addRandomSmallMountainArea(
  tiles: Record<string, Tile>,
  ctx: LayerMapContext,
): LayerOpResult {
  const seed = ctx.seed ?? Date.now()
  const rand = mulberry32(seed)
  const next = cloneTiles(tiles)
  const landKeys = Object.keys(next).filter((k) => canPlaceMountain(next[k]))
  if (landKeys.length === 0) return emptyResult('No valid land tiles for mountains')

  const startKey = landKeys[Math.floor(rand() * landKeys.length)]
  const start = next[startKey].coord
  const targetSize = 3 + Math.floor(rand() * 10) // 3–12
  const placed = new Set<string>()
  const frontier: AxialCoord[] = [start]
  const visited = new Set<string>([startKey])

  while (frontier.length > 0 && placed.size < targetSize) {
    const idx = Math.floor(rand() * frontier.length)
    const current = frontier.splice(idx, 1)[0]
    const key = tileKey(current)
    const tile = next[key]
    if (!tile || !canPlaceMountain(tile)) continue
    applyMountain(tile)
    placed.add(key)
    for (const n of neighbors(current)) {
      const nKey = tileKey(n)
      if (!next[nKey] || visited.has(nKey)) continue
      if (rand() < 0.72) {
        visited.add(nKey)
        frontier.push(n)
      }
    }
  }

  if (placed.size === 0) return emptyResult('Could not place mountain area')
  return successResult(
    next,
    placed.size,
    `Placed small mountain area (${placed.size} tiles).`,
    [],
    { seed, size: placed.size },
  )
}

export function addRandomMountainChain(
  tiles: Record<string, Tile>,
  ctx: LayerMapContext,
): LayerOpResult {
  const seed = ctx.seed ?? Date.now()
  const rand = mulberry32(seed)
  const next = cloneTiles(tiles)
  const landKeys = Object.keys(next).filter((k) => canPlaceMountain(next[k]))
  if (landKeys.length < 8) return emptyResult('Not enough land for a mountain chain')

  const startKey = landKeys[Math.floor(rand() * landKeys.length)]
  let current = next[startKey].coord
  let dir = Math.floor(rand() * 6)
  const length = 6 + Math.floor(rand() * 19) // 6–24
  const DIRS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]
  const placed = new Set<string>()
  let wideStreak = 0

  for (let step = 0; step < length; step++) {
    const key = tileKey(current)
    const tile = next[key]
    if (!tile || !canPlaceMountain(tile)) break
    applyMountain(tile)
    placed.add(key)

    if (wideStreak <= 0 && rand() < 0.22) wideStreak = 2 + Math.floor(rand() * 2)
    if (wideStreak > 0) {
      wideStreak--
      for (const pd of [DIRS[(dir + 2) % 6], DIRS[(dir + 4) % 6]]) {
        if (rand() < 0.65) {
          const wide = { q: current.q + pd.q, r: current.r + pd.r }
          const wk = tileKey(wide)
          const wt = next[wk]
          if (wt && canPlaceMountain(wt)) {
            applyMountain(wt)
            placed.add(wk)
          }
        }
      }
    }

    let found = false
    for (let attempt = 0; attempt < 4; attempt++) {
      if (rand() < 0.3 || attempt > 0) dir = (dir + (rand() < 0.5 ? 1 : 5)) % 6
      const nextCoord = { q: current.q + DIRS[dir].q, r: current.r + DIRS[dir].r }
      const nk = tileKey(nextCoord)
      if (next[nk] && canPlaceMountain(next[nk])) {
        current = nextCoord
        found = true
        break
      }
    }
    if (!found) break
  }

  // Optional foothills along chain
  for (const key of placed) {
    for (const n of neighbors(next[key].coord)) {
      const nk = tileKey(n)
      const nt = next[nk]
      if (!nt || nt.cityId || isWaterTerrain(nt.terrain) || nt.terrain === 'mountains') continue
      if (rand() < 0.35) {
        nt.hasHills = true
        clearInvalidResource(nt)
      }
    }
  }

  if (placed.size === 0) return emptyResult('Could not place mountain chain')

  // Contiguity check for meta
  const keys = [...placed]
  let maxGap = 0
  for (let i = 1; i < keys.length; i++) {
    maxGap = Math.max(maxGap, hexDistance(next[keys[i - 1]].coord, next[keys[i]].coord))
  }

  return successResult(
    next,
    placed.size,
    `Placed mountain chain (${placed.size} tiles).`,
    [],
    { seed, size: placed.size, lengthTarget: length },
  )
}

/** Exported for tests — hex line helper reuse. */
export function _hexLineForTest(a: AxialCoord, b: AxialCoord): AxialCoord[] {
  return hexLine(a, b)
}
