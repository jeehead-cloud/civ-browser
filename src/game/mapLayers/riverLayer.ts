import { AxialCoord, Tile } from '../types'
import { neighbors, tileKey } from '../hexGrid'
import {
  addMirroredRiverEdge,
  cloneTiles,
  directionIndex,
  isWaterTerrain,
} from './clone'
import { findUnmirroredRiverEdges } from './layerValidation'
import { mulberry32 } from './rng'
import { emptyResult, failResult, LayerMapContext, LayerOpResult, successResult } from './types'

export function clearAllRivers(tiles: Record<string, Tile>): LayerOpResult {
  const next = cloneTiles(tiles)
  let tilesChanged = 0
  for (const key in next) {
    if (next[key].riverDirections.length > 0) {
      next[key].riverDirections = []
      tilesChanged++
    }
  }
  if (tilesChanged === 0) return emptyResult('No rivers to clear')
  return successResult(next, tilesChanged, `Cleared rivers on ${tilesChanged} tiles`)
}

function buildDistanceToWater(tiles: Record<string, Tile>): Map<string, number> {
  const distanceToWater = new Map<string, number>()
  const visited = new Set<string>()
  const frontier: { key: string; dist: number }[] = []
  for (const key in tiles) {
    if (isWaterTerrain(tiles[key].terrain)) {
      distanceToWater.set(key, 0)
      visited.add(key)
      frontier.push({ key, dist: 0 })
    }
  }
  while (frontier.length > 0) {
    const { key, dist } = frontier.shift()!
    const coord = tiles[key].coord
    for (const n of neighbors(coord)) {
      const nKey = tileKey(n)
      if (!tiles[nKey] || visited.has(nKey)) continue
      visited.add(nKey)
      distanceToWater.set(nKey, dist + 1)
      frontier.push({ key: nKey, dist: dist + 1 })
    }
  }
  return distanceToWater
}

function growRiverPath(
  tiles: Record<string, Tile>,
  startKey: string,
  maxLength: number,
  distanceToWater: Map<string, number>,
  rand: () => number,
): { edges: number; steps: number } {
  let current = tiles[startKey].coord
  const visited = new Set<string>([startKey])
  let edges = 0
  let steps = 0

  for (let step = 0; step < maxLength; step++) {
    const curKey = tileKey(current)
    const curDist = distanceToWater.get(curKey) ?? 0
    if (curDist === 0) break

    let best: AxialCoord | null = null
    let bestDist = curDist
    const candidates = neighbors(current).filter((n) => tiles[tileKey(n)])
    const order = candidates.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    for (const idx of order) {
      const n = candidates[idx]
      const nKey = tileKey(n)
      if (visited.has(nKey)) continue
      const nDist = distanceToWater.get(nKey) ?? 0
      if (nDist < bestDist) {
        bestDist = nDist
        best = n
      }
    }
    if (!best) break

    const dirFrom = directionIndex(current, best)
    const nextKey = tileKey(best)
    if (dirFrom >= 0) {
      edges += addMirroredRiverEdge(tiles, curKey, nextKey, dirFrom)
    }
    visited.add(nextKey)
    current = best
    steps++
  }
  return { edges, steps }
}

function pickRiverSource(
  tiles: Record<string, Tile>,
  distanceToWater: Map<string, number>,
  rand: () => number,
): string | null {
  const candidates: string[] = []
  for (const key in tiles) {
    const t = tiles[key]
    if (isWaterTerrain(t.terrain)) continue
    const d = distanceToWater.get(key) ?? 0
    if (d < 2) continue
    const elev = t.terrain === 'mountains' ? 3 : t.hasHills ? 2 : 1
    // Weight by elevation and inland distance
    const weight = elev * 10 + d
    for (let i = 0; i < weight; i++) candidates.push(key)
  }
  if (candidates.length === 0) {
    for (const key in tiles) {
      if (!isWaterTerrain(tiles[key].terrain) && (distanceToWater.get(key) ?? 0) >= 1) {
        candidates.push(key)
      }
    }
  }
  if (candidates.length === 0) return null
  return candidates[Math.floor(rand() * candidates.length)]
}

function addRandomRiver(
  tiles: Record<string, Tile>,
  ctx: LayerMapContext,
  kind: 'short' | 'long',
): LayerOpResult {
  const seed = ctx.seed ?? Date.now()
  const rand = mulberry32(seed)
  const next = cloneTiles(tiles)
  const distanceToWater = buildDistanceToWater(next)
  const source = pickRiverSource(next, distanceToWater, rand)
  if (!source) return emptyResult(`No valid ${kind} river source found`)

  const maxLength =
    kind === 'short'
      ? 3 + Math.floor(rand() * 8) // 3–10
      : 10 + Math.floor(rand() * 21) // 10–30

  const { edges, steps } = growRiverPath(next, source, maxLength, distanceToWater, rand)
  if (steps === 0 || edges === 0) {
    return emptyResult(`Could not grow a ${kind} river from chosen source`)
  }

  const bad = findUnmirroredRiverEdges(next)
  if (bad.length > 0) {
    return failResult(`River mirroring broken (${bad.length} edges)`)
  }

  let tilesChanged = 0
  for (const key in next) {
    const a = tiles[key].riverDirections
    const b = next[key].riverDirections
    if (a.length !== b.length || a.some((d, i) => d !== b[i])) tilesChanged++
  }

  return successResult(
    next,
    tilesChanged,
    `Added ${kind} river (${steps} steps, ${edges} edge records).`,
    [],
    { seed, steps, edges, maxLength },
  )
}

export function addRandomShortRiver(
  tiles: Record<string, Tile>,
  ctx: LayerMapContext,
): LayerOpResult {
  return addRandomRiver(tiles, ctx, 'short')
}

export function addRandomLongRiver(
  tiles: Record<string, Tile>,
  ctx: LayerMapContext,
): LayerOpResult {
  return addRandomRiver(tiles, ctx, 'long')
}
