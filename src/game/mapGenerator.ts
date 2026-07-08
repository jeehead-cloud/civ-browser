import { AxialCoord, Tile, TerrainType } from './types'
import { axialToPixel, generateMapCoords, getMapPixelBounds, hexDistance, neighbors, tileKey } from './hexGrid'
import { RESOURCE_RULES, tileMatchesRule } from './resourceData'

interface GenOptions {
  width: number
  height: number
  landmassCount?: number
  landRatio?: number
}

const DIRS: AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateSmoothField(
  coordsByKey: Map<string, AxialCoord>,
  rand: () => number,
  passes = 4,
): Map<string, number> {
  let field = new Map<string, number>()
  for (const key of coordsByKey.keys()) {
    field.set(key, rand())
  }
  for (let p = 0; p < passes; p++) {
    const next = new Map<string, number>()
    for (const [key, coord] of coordsByKey) {
      let sum = field.get(key)!
      let count = 1
      for (const n of neighbors(coord)) {
        const nKey = tileKey(n)
        const nVal = field.get(nKey)
        if (nVal !== undefined) {
          sum += nVal
          count++
        }
      }
      next.set(key, sum / count)
    }
    field = next
  }
  return field
}

function growBlob(
  seedCoord: AxialCoord,
  maxSize: number,
  isAllowed: (key: string) => boolean,
  rand: () => number,
  spreadChance = 0.7,
): string[] {
  const result: string[] = []
  const visited = new Set<string>([tileKey(seedCoord)])
  const frontier: AxialCoord[] = [seedCoord]

  while (frontier.length > 0 && result.length < maxSize) {
    const idx = Math.floor(rand() * frontier.length)
    const current = frontier.splice(idx, 1)[0]
    const key = tileKey(current)
    if (isAllowed(key)) {
      result.push(key)
      for (const d of DIRS) {
        const n = { q: current.q + d.q, r: current.r + d.r }
        const nKey = tileKey(n)
        if (!visited.has(nKey) && isAllowed(nKey) && rand() < spreadChance) {
          visited.add(nKey)
          frontier.push(n)
        }
      }
    }
  }
  return result
}

function computeComponents(
  isLand: Set<string>,
  coordsByKey: Map<string, AxialCoord>,
): { componentOf: Map<string, number>; sizes: number[] } {
  const componentOf = new Map<string, number>()
  const sizes: number[] = []
  let compId = 0
  for (const key of isLand) {
    if (componentOf.has(key)) continue
    const queue = [key]
    componentOf.set(key, compId)
    let size = 0
    while (queue.length > 0) {
      const cur = queue.pop()!
      size++
      const coord = coordsByKey.get(cur)!
      for (const n of neighbors(coord)) {
        const nKey = tileKey(n)
        if (isLand.has(nKey) && !componentOf.has(nKey)) {
          componentOf.set(nKey, compId)
          queue.push(nKey)
        }
      }
    }
    sizes.push(size)
    compId++
  }
  return { componentOf, sizes }
}

function isFarFromLand(coord: AxialCoord, isLand: Set<string>, minDist: number): boolean {
  let frontier: AxialCoord[] = [coord]
  const visited = new Set<string>([tileKey(coord)])
  for (let d = 0; d < minDist; d++) {
    const next: AxialCoord[] = []
    for (const c of frontier) {
      for (const dir of DIRS) {
        const n = { q: c.q + dir.q, r: c.r + dir.r }
        const nKey = tileKey(n)
        if (visited.has(nKey)) continue
        visited.add(nKey)
        if (isLand.has(nKey)) return false
        next.push(n)
      }
    }
    frontier = next
  }
  return true
}

function directionIndex(from: AxialCoord, to: AxialCoord): number {
  for (let i = 0; i < 6; i++) {
    if (from.q + DIRS[i].q === to.q && from.r + DIRS[i].r === to.r) return i
  }
  return -1
}

export function generateProceduralMap(options: GenOptions, seed = Date.now()): Record<string, Tile> {
  const { width, height } = options
  const landmassCount = options.landmassCount ?? Math.max(3, Math.round((width * height) / 4000))
  const landRatio = options.landRatio ?? 0.35

  const rand = mulberry32(seed)
  const coords = generateMapCoords(width, height)
  const coordsByKey = new Map<string, AxialCoord>()
  for (const c of coords) coordsByKey.set(tileKey(c), c)

  const tiles: Record<string, Tile> = {}
  for (const coord of coords) {
    tiles[tileKey(coord)] = {
      coord,
      terrain: 'ocean',
      vegetation: 'none',
      resource: 'none',
      ownerCivId: null,
      cityId: null,
      hasHills: false,
      riverDirections: [],
    }
  }

  const bounds = getMapPixelBounds(width, height)
  const centerY = (bounds.minY + bounds.maxY) / 2
  const halfHeight = (bounds.maxY - bounds.minY) / 2
  function latitudeFactor(coord: AxialCoord): number {
    const { y } = axialToPixel(coord)
    return Math.min(1, Math.abs(y - centerY) / halfHeight)
  }

  // ============================================================
  // STAGE 1: Continent shape (land vs ocean, coast, extra islands)
  // ============================================================
  const shapeNoise = generateSmoothField(coordsByKey, mulberry32(seed + 111), 2)

  const targetLandCount = Math.floor(coords.length * landRatio)
  let landCount = 0
  const seeds: AxialCoord[] = []
  for (let i = 0; i < landmassCount; i++) {
    seeds.push(coords[Math.floor(rand() * coords.length)])
  }
  const frontier: AxialCoord[] = [...seeds]
  const visitedLand = new Set<string>()
  const isLand = new Set<string>()

  while (frontier.length > 0 && landCount < targetLandCount) {
    const idx = Math.floor(rand() * frontier.length)
    const current = frontier.splice(idx, 1)[0]
    const key = tileKey(current)
    if (visitedLand.has(key)) continue
    visitedLand.add(key)

    if (!isLand.has(key)) {
      isLand.add(key)
      landCount++
    }

    for (const n of neighbors(current)) {
      const nKey = tileKey(n)
      if (!coordsByKey.has(nKey) || visitedLand.has(nKey)) continue
      const noiseVal = shapeNoise.get(nKey) ?? 0.5
      const spreadChance = Math.min(0.95, Math.max(0.15, 0.72 * (0.5 + noiseVal * 0.9)))
      if (rand() < spreadChance) {
        frontier.push(n)
      }
    }
  }

  const smallIslandCount = 5 + Math.floor(rand() * 6) // 5-10 tiny islands
  for (let i = 0; i < smallIslandCount; i++) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const candidate = coords[Math.floor(rand() * coords.length)]
      if (isFarFromLand(candidate, isLand, 4)) {
        const size = 1 + Math.floor(rand() * 3)
        const blob = growBlob(candidate, size, () => true, rand, 0.6)
        for (const key of blob) {
          if (!isLand.has(key)) {
            isLand.add(key)
            landCount++
          }
        }
        break
      }
    }
  }

  const largeIslandCount = 1 + Math.floor(rand() * 3) // 1-3 larger islands
  for (let i = 0; i < largeIslandCount; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = coords[Math.floor(rand() * coords.length)]
      if (isFarFromLand(candidate, isLand, 6)) {
        const size = 15 + Math.floor(rand() * 26) // 15-40 tiles
        const blob = growBlob(candidate, size, () => true, rand, 0.72)
        for (const key of blob) {
          if (!isLand.has(key)) {
            isLand.add(key)
            landCount++
          }
        }
        break
      }
    }
  }

  // Detect ocean tiles that are NOT reachable from the map's open water
  // (i.e. small pockets fully enclosed by land) and convert them directly
  // into lakes, so they don't get miscolored as isolated coast dots.
  const openOceanVisited = new Set<string>()
  const openOceanFrontier: AxialCoord[] = []
  for (const coord of coords) {
    const key = tileKey(coord)
    if (!isLand.has(key) && !openOceanVisited.has(key)) {
      // seed BFS from any non-land tile on the outer border of the map
      const isBorder =
        coord.q === 0 ||
        neighbors(coord).some((n) => !coordsByKey.has(tileKey(n)))
      if (isBorder) {
        openOceanVisited.add(key)
        openOceanFrontier.push(coord)
      }
    }
  }
  while (openOceanFrontier.length > 0) {
    const current = openOceanFrontier.pop()!
    for (const n of neighbors(current)) {
      const nKey = tileKey(n)
      if (coordsByKey.has(nKey) && !isLand.has(nKey) && !openOceanVisited.has(nKey)) {
        openOceanVisited.add(nKey)
        openOceanFrontier.push(n)
      }
    }
  }
  const enclosedPocketKeys: string[] = []
  for (const coord of coords) {
    const key = tileKey(coord)
    if (!isLand.has(key) && !openOceanVisited.has(key)) {
      enclosedPocketKeys.push(key)
      tiles[key].terrain = 'lake'
    }
  }

  const COAST_RADIUS = 2 + Math.floor(rand() * 2)
  const coastDistance = new Map<string, number>()
  const coastVisited = new Set<string>([...isLand, ...enclosedPocketKeys])
  let coastFrontier: { coord: AxialCoord; dist: number }[] = []
  for (const key of isLand) {
    coastFrontier.push({ coord: coordsByKey.get(key)!, dist: 0 })
  }
  while (coastFrontier.length > 0) {
    const { coord, dist } = coastFrontier.shift()!
    if (dist >= COAST_RADIUS) continue
    for (const n of neighbors(coord)) {
      const nKey = tileKey(n)
      if (coordsByKey.has(nKey) && !coastVisited.has(nKey)) {
        coastVisited.add(nKey)
        coastDistance.set(nKey, dist + 1)
        coastFrontier.push({ coord: n, dist: dist + 1 })
      }
    }
  }
  for (const key of coastDistance.keys()) {
    tiles[key].terrain = 'coast'
  }

  // Land tiles still have the placeholder terrain: 'ocean' from initial
  // tile creation at this point, since real biome assignment doesn't
  // happen until Stage 4. That breaks any later check for "is this tile
  // walkable land" via terrain !== 'ocean'. Assign a temporary placeholder
  // now so terrain === 'ocean' reliably means real water from here on;
  // Stage 4 will overwrite this with the actual biome terrain.
  for (const key of isLand) {
    tiles[key].terrain = 'grassland'
  }

  // ============================================================
  // STAGE 2: Elevation - mountain ranges (with contiguous wide
  // stretches instead of scattered single-hex widenings) + hills
  // ============================================================
  const { componentOf, sizes: componentSizes } = computeComponents(isLand, coordsByKey)
  const landArray = Array.from(isLand)

  const sizeableComponentIds = componentSizes
    .map((size, id) => ({ id, size }))
    .filter((c) => c.size >= 25)
    .sort((a, b) => b.size - a.size)

  const totalRanges = Math.max(1, Math.min(3, sizeableComponentIds.length)) + Math.floor(rand() * 2)
  const rangeLength = Math.max(6, Math.round(width / 10))

  function growMountainRange(startKey: string) {
    let current = coordsByKey.get(startKey)!
    let dir = Math.floor(rand() * 6)
    const length = rangeLength + Math.floor(rand() * rangeLength)
    let wideStreak = 0

    for (let step = 0; step < length; step++) {
      const key = tileKey(current)
      const tile = tiles[key]
      if (!tile || tile.terrain === 'ocean' || tile.terrain === 'coast') break
      tile.terrain = 'mountains'

      if (wideStreak <= 0 && rand() < 0.2) {
        wideStreak = 2 + Math.floor(rand() * 3) // start a 2-4 step wide stretch
      }
      if (wideStreak > 0) {
        wideStreak--
        const perpDirs = [DIRS[(dir + 2) % 6], DIRS[(dir + 4) % 6]]
        for (const pd of perpDirs) {
          if (rand() < 0.7) {
            const wideCoord = { q: current.q + pd.q, r: current.r + pd.r }
            const wideKey = tileKey(wideCoord)
            const wideTile = tiles[wideKey]
            if (wideTile && wideTile.terrain !== 'ocean' && wideTile.terrain !== 'coast') {
              wideTile.terrain = 'mountains'
            }
          }
        }
      }

      let found = false
      for (let attempt = 0; attempt < 4; attempt++) {
        if (rand() < 0.25 || attempt > 0) {
          dir = (dir + (rand() < 0.5 ? 1 : 5)) % 6
        }
        const next = { q: current.q + DIRS[dir].q, r: current.r + DIRS[dir].r }
        const nextKey = tileKey(next)
        const nextTile = tiles[nextKey]
        if (nextTile && nextTile.terrain !== 'ocean' && nextTile.terrain !== 'coast') {
          current = next
          found = true
          break
        }
      }
      if (!found) break
    }
  }

  let rangesUsed = 0
  for (const comp of sizeableComponentIds) {
    if (rangesUsed >= totalRanges) break
    const memberKeys = landArray.filter((k) => componentOf.get(k) === comp.id)
    if (memberKeys.length === 0) continue
    growMountainRange(memberKeys[Math.floor(rand() * memberKeys.length)])
    rangesUsed++
  }
  while (rangesUsed < totalRanges) {
    growMountainRange(landArray[Math.floor(rand() * landArray.length)])
    rangesUsed++
  }

  for (const key of isLand) {
    const tile = tiles[key]
    if (tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'mountains') continue
    if (rand() < 0.004) tile.terrain = 'mountains'
  }

  // Reconnect any landmass split by mountains into disconnected regions
  const allComponentIds = new Set(componentOf.values())
  for (const compId of allComponentIds) {
    const memberKeys: string[] = []
    for (const [key, id] of componentOf) {
      if (id === compId) memberKeys.push(key)
    }
    if (memberKeys.length < 15) continue
    const memberSet = new Set(memberKeys)

    function isWalkable(key: string): boolean {
      const t = tiles[key]
      return !!t && t.terrain !== 'mountains'
    }
    function computeWalkableComponents(): string[][] {
      const seen = new Set<string>()
      const comps: string[][] = []
      for (const key of memberKeys) {
        if (!isWalkable(key) || seen.has(key)) continue
        const queue = [key]
        seen.add(key)
        const comp: string[] = []
        while (queue.length > 0) {
          const cur = queue.pop()!
          comp.push(cur)
          const coord = coordsByKey.get(cur)!
          for (const n of neighbors(coord)) {
            const nKey = tileKey(n)
            if (memberSet.has(nKey) && isWalkable(nKey) && !seen.has(nKey)) {
              seen.add(nKey)
              queue.push(nKey)
            }
          }
        }
        comps.push(comp)
      }
      return comps
    }

    let guard = 0
    let previousComponentCount = Infinity
    while (guard++ < 4) {
      const comps = computeWalkableComponents()
      if (comps.length <= 1) break
      if (comps.length >= previousComponentCount) break // no progress last time, stop
      previousComponentCount = comps.length

      comps.sort((a, b) => b.length - a.length)
      // Skip reconnecting if the second piece is too small to matter (likely
      // just a tiny pocket sealed off by the wide ridge, not a real "trap")
      if (comps[1].length < 6) break

      const target = new Set(comps[0])
      const goal = new Set(comps[1])

      const dist = new Map<string, number>()
      const prevMap = new Map<string, string>()
      const deque: string[] = []
      for (const key of target) {
        dist.set(key, 0)
        deque.push(key)
      }
      let goalReached: string | null = null
      while (deque.length > 0) {
        const cur = deque.shift()!
        if (goal.has(cur)) {
          goalReached = cur
          break
        }
        const curDist = dist.get(cur)!
        const coord = coordsByKey.get(cur)!
        for (const n of neighbors(coord)) {
          const nKey = tileKey(n)
          if (!memberSet.has(nKey)) continue
          const cost = tiles[nKey].terrain === 'mountains' ? 1 : 0
          const nd = curDist + cost
          if (!dist.has(nKey) || nd < dist.get(nKey)!) {
            dist.set(nKey, nd)
            prevMap.set(nKey, cur)
            if (cost === 0) deque.unshift(nKey)
            else deque.push(nKey)
          }
        }
      }
      if (!goalReached) break
      let cur: string | undefined = goalReached
      while (cur !== undefined) {
        if (tiles[cur].terrain === 'mountains') {
          tiles[cur].terrain = 'plains'
          tiles[cur].hasHills = true
        }
        cur = prevMap.get(cur)
      }
    }
  }

  // Hills: foothills near mountains + standalone hilly noise regions
  for (const key of isLand) {
    const tile = tiles[key]
    if (tile.terrain !== 'mountains') continue
    for (const n of neighbors(tile.coord)) {
      const nKey = tileKey(n)
      const nTile = tiles[nKey]
      if (nTile && nTile.terrain !== 'ocean' && nTile.terrain !== 'coast' && nTile.terrain !== 'mountains') {
        if (rand() < 0.45) nTile.hasHills = true
      }
    }
  }
  // Second ring: extend foothills a bit further out from mountains, at
  // lower probability, so ridges read as short chains rather than a
  // single ring of isolated hill dots.
  for (const key of isLand) {
    const tile = tiles[key]
    if (tile.hasHills || tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'mountains') continue
    const nearMountainRing2 = neighbors(tile.coord).some((n) => {
      const nTile = tiles[tileKey(n)]
      if (!nTile) return false
      return neighbors(nTile.coord).some((n2) => tiles[tileKey(n2)]?.terrain === 'mountains')
    })
    if (nearMountainRing2 && rand() < 0.2) {
      tile.hasHills = true
    }
  }
  const hillinessField = generateSmoothField(coordsByKey, mulberry32(seed + 424242), 3)
  for (const key of isLand) {
    const tile = tiles[key]
    if (tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'mountains') continue
    if (tile.hasHills) continue
    if (hillinessField.get(key)! > 0.63) tile.hasHills = true
  }

  // ============================================================
  // STAGE 3: Rivers - from mountains/hills down to the sea
  // ============================================================
  const distanceToWater = new Map<string, number>()
  const waterVisited = new Set<string>()
  let waterFrontier: { coord: AxialCoord; dist: number }[] = []
  for (const coord of coords) {
    const key = tileKey(coord)
    const t = tiles[key].terrain
    if (t === 'ocean' || t === 'coast' || t === 'lake') {
      distanceToWater.set(key, 0)
      waterVisited.add(key)
      waterFrontier.push({ coord, dist: 0 })
    }
  }
  while (waterFrontier.length > 0) {
    const { coord, dist } = waterFrontier.shift()!
    for (const n of neighbors(coord)) {
      const nKey = tileKey(n)
      if (coordsByKey.has(nKey) && !waterVisited.has(nKey)) {
        waterVisited.add(nKey)
        distanceToWater.set(nKey, dist + 1)
        waterFrontier.push({ coord: n, dist: dist + 1 })
      }
    }
  }

  function growRiver(startKey: string, maxLength: number) {
    let current = coordsByKey.get(startKey)!
    const visitedInRiver = new Set<string>([startKey])

    for (let step = 0; step < maxLength; step++) {
      const curKey = tileKey(current)
      const curDist = distanceToWater.get(curKey) ?? 0
      if (curDist === 0) break

      let best: AxialCoord | null = null
      let bestDist = curDist
      const candidates = neighbors(current).filter((n) => coordsByKey.has(tileKey(n)))
      // shuffle-ish tie-break by scanning in random order
      const order = candidates.map((_, i) => i).sort(() => rand() - 0.5)
      for (const idx of order) {
        const n = candidates[idx]
        const nKey = tileKey(n)
        if (visitedInRiver.has(nKey)) continue
        const nDist = distanceToWater.get(nKey) ?? 0
        if (nDist < bestDist) {
          bestDist = nDist
          best = n
        }
      }
      if (!best) break

      const dirFromCurrent = directionIndex(current, best)
      const dirFromNext = directionIndex(best, current)
      const curTile = tiles[curKey]
      const nextTile = tiles[tileKey(best)]
      if (dirFromCurrent >= 0 && !curTile.riverDirections.includes(dirFromCurrent)) {
        curTile.riverDirections.push(dirFromCurrent)
      }
      if (dirFromNext >= 0 && !nextTile.riverDirections.includes(dirFromNext)) {
        nextTile.riverDirections.push(dirFromNext)
      }

      visitedInRiver.add(tileKey(best))
      current = best
    }
  }

  for (const compId of allComponentIds) {
    const memberKeys = landArray.filter((k) => componentOf.get(k) === compId)
    const compSize = memberKeys.length
    if (compSize < 40) continue

    const maxDist = memberKeys.reduce((m, k) => Math.max(m, distanceToWater.get(k) ?? 0), 0)
    if (maxDist < 1) continue // truly flat sliver of land, skip

    const usedSources = new Set<string>()

    function pickInlandPool(minRatio: number): string[] {
      const pool = memberKeys.filter((k) => {
        const t = tiles[k]
        return t.riverDirections.length === 0 && !usedSources.has(k) && (distanceToWater.get(k) ?? 0) >= Math.max(1, maxDist * minRatio)
      })
      return pool.sort((a, b) => {
        const aElev = tiles[a].terrain === 'mountains' ? 2 : tiles[a].hasHills ? 1 : 0
        const bElev = tiles[b].terrain === 'mountains' ? 2 : tiles[b].hasHills ? 1 : 0
        if (aElev !== bElev) return bElev - aElev
        return (distanceToWater.get(b) ?? 0) - (distanceToWater.get(a) ?? 0)
      })
    }

    // Major rivers: try a strict inland threshold first, fall back to
    // progressively looser ones so a river still gets placed.
    let majorPool = pickInlandPool(0.6)
    if (majorPool.length === 0) majorPool = pickInlandPool(0.3)
    if (majorPool.length === 0) majorPool = pickInlandPool(0)

    const majorCount = Math.min(4, compSize >= 250 ? 4 : compSize >= 120 ? 3 : 2)
    const majorMaxLength = Math.max(20, Math.round((width + height) / 4))
    for (let i = 0; i < majorCount && majorPool.length > 0; i++) {
      const idx = Math.floor(rand() * Math.min(majorPool.length, 5))
      const source = majorPool.splice(idx, 1)[0]
      if (!source || usedSources.has(source)) continue
      usedSources.add(source)
      growRiver(source, majorMaxLength)
    }

    // Minor rivers: closer to the coast, shorter. Fall back to any
    // unused land tile if the coastal band filter comes up empty.
    let minorPool = memberKeys.filter((k) => {
      const t = tiles[k]
      const d = distanceToWater.get(k) ?? 0
      return t.riverDirections.length === 0 && !usedSources.has(k) && d >= 1 && d <= Math.max(1, maxDist * 0.6)
    })
    if (minorPool.length === 0) {
      minorPool = memberKeys.filter((k) => tiles[k].riverDirections.length === 0 && !usedSources.has(k))
    }

    const minorCount = 3 + Math.floor(rand() * 4) // 3-6
    const minorMaxLength = Math.max(6, Math.round((width + height) / 14))
    for (let i = 0; i < minorCount && minorPool.length > 0; i++) {
      const idx = Math.floor(rand() * minorPool.length)
      const source = minorPool.splice(idx, 1)[0]
      usedSources.add(source)
      growRiver(source, minorMaxLength)
    }
  }
  console.log('river tiles:', Object.values(tiles).filter((t) => t.riverDirections.length > 0).length)

  // ============================================================
  // STAGE 4: Biome & vegetation (latitude bands, great deserts,
  // transition buffers, forest/jungle, swamps near river mouths)
  // ============================================================
  const noiseField = generateSmoothField(coordsByKey, mulberry32(seed + 55), 4)

  const BANDS: { max: number; terrains: TerrainType[] }[] = [
    { max: 0.12, terrains: ['grassland', 'plains'] },
    { max: 0.35, terrains: ['plains', 'grassland'] },
    { max: 0.72, terrains: ['plains', 'grassland'] },
    { max: 0.88, terrains: ['tundra', 'plains'] },
    { max: 1.01, terrains: ['snow', 'tundra'] },
  ]
  const EXCEPTION_CHANCE = 0.08

  for (const key of isLand) {
    const tile = tiles[key]
    if (tile.terrain === 'mountains') continue
    const lat = latitudeFactor(tile.coord)
    const noise = noiseField.get(key)!

    let bandIndex = BANDS.findIndex((b) => lat <= b.max)
    if (bandIndex === -1) bandIndex = BANDS.length - 1

    if (rand() < EXCEPTION_CHANCE) {
      const delta = rand() < 0.5 ? -1 : 1
      const shifted = Math.max(0, Math.min(BANDS.length - 1, bandIndex + delta))
      const shiftedTerrains = BANDS[shifted].terrains
      const wouldBeCold = shiftedTerrains.includes('tundra') || shiftedTerrains.includes('snow')
      if (!wouldBeCold || lat > 0.55) {
        bandIndex = shifted
      }
    }

    const band = BANDS[bandIndex]
    tile.terrain = band.terrains[noise < 0.5 ? 0 : 1]
  }

  // Great deserts, capped per-landmass, skipping tiles with a river
  const moistureField = generateSmoothField(coordsByKey, mulberry32(seed + 7919), 5)
  const desertCandidates = landArray.filter((key) => {
    const lat = latitudeFactor(coordsByKey.get(key)!)
    return lat > 0.15 && lat <= 0.42 && tiles[key].terrain !== 'coast'
  })
  const desertCount = desertCandidates.length > 0 ? 1 + (rand() < 0.5 ? 1 : 0) : 0
  for (let i = 0; i < desertCount && desertCandidates.length > 0; i++) {
    const seedKey = desertCandidates[Math.floor(rand() * desertCandidates.length)]
    const seedCoord = coordsByKey.get(seedKey)!
    const compId = componentOf.get(seedKey) ?? -1
    const compSize = compId >= 0 ? componentSizes[compId] : landCount
    const maxSize = Math.min(Math.round(landCount * (0.04 + rand() * 0.05)), Math.round(compSize * 0.45))
    if (maxSize < 3) continue

    const visited = new Set<string>([seedKey])
    const blobFrontier: AxialCoord[] = [seedCoord]
    let placed = 0
    while (blobFrontier.length > 0 && placed < maxSize) {
      const idx = Math.floor(rand() * blobFrontier.length)
      const current = blobFrontier.splice(idx, 1)[0]
      const curKey = tileKey(current)
      const tile = tiles[curKey]
      if (tile && tile.terrain !== 'ocean' && tile.terrain !== 'coast' && tile.terrain !== 'mountains') {
        const moisture = moistureField.get(curKey) ?? 0
        const hasRiver = tile.riverDirections.length > 0
        if (moisture <= 0.5 && !hasRiver) {
          tile.terrain = 'desert'
        }
        placed++
      }
      for (const d of DIRS) {
        const n = { q: current.q + d.q, r: current.r + d.r }
        const nKey = tileKey(n)
        if (coordsByKey.has(nKey) && isLand.has(nKey) && !visited.has(nKey) && rand() < 0.68) {
          visited.add(nKey)
          blobFrontier.push(n)
        }
      }
    }
  }

  // Transition buffer: plains between grassland and desert/tundra/snow
  for (let pass = 0; pass < 2; pass++) {
    const pending: string[] = []
    for (const key of isLand) {
      const tile = tiles[key]
      if (tile.terrain !== 'grassland') continue
      const touchesHarsh = neighbors(tile.coord).some((n) => {
        const nTile = tiles[tileKey(n)]
        return nTile && (nTile.terrain === 'desert' || nTile.terrain === 'tundra' || nTile.terrain === 'snow')
      })
      if (touchesHarsh) pending.push(key)
    }
    for (const key of pending) tiles[key].terrain = 'plains'
  }

  // Vegetation: tundra gets more forest (taiga), tropical grassland gets
  // jungle, the arid band near deserts stays mostly bare (steppe), and
  // temperate latitudes get a moderate amount of forest.
  for (const key of isLand) {
    const tile = tiles[key]
    const lat = latitudeFactor(tile.coord)

    if (tile.terrain === 'tundra') {
      if (rand() < 0.35) tile.vegetation = 'forest'
      continue
    }

    if (tile.terrain !== 'plains' && tile.terrain !== 'grassland') continue

    if (lat <= 0.18) {
      // Tropical band: grassland leans jungle strongly, plains more lightly
      if (tile.terrain === 'grassland' && rand() < 0.45) tile.vegetation = 'jungle'
      else if (tile.terrain === 'plains' && rand() < 0.22) tile.vegetation = 'jungle'
    } else if (lat > 0.15 && lat <= 0.42) {
      // Arid/steppe band overlapping where deserts spawn: little to no forest
      if (rand() < 0.05) tile.vegetation = 'forest'
    } else {
      // Temperate band: moderate forest
      if (rand() < 0.22) tile.vegetation = 'forest'
    }
  }

  // Swamps: low-lying, moist tiles near a river close to the coast
  for (const key of isLand) {
    const tile = tiles[key]
    if (tile.riverDirections.length === 0) continue
    if (tile.terrain !== 'grassland' && tile.terrain !== 'plains') continue
    const nearCoast = neighbors(tile.coord).some((n) => {
      const nTile = tiles[tileKey(n)]
      return nTile && (nTile.terrain === 'coast' || nTile.terrain === 'lake')
    })
    const moisture = moistureField.get(key) ?? 0
    if (nearCoast && moisture > 0.55 && rand() < 0.35) {
      tile.vegetation = 'swamp'
    }
  }

  // Lakes: interior water pockets per landmass
  const componentsMap = new Map<number, string[]>()
  for (const key of isLand) {
    const compId = componentOf.get(key)
    if (compId === undefined) continue
    if (!componentsMap.has(compId)) componentsMap.set(compId, [])
    componentsMap.get(compId)!.push(key)
  }
  for (const [compId, memberKeys] of componentsMap) {
    const compSize = componentSizes[compId]
    if (compSize < 30) continue
    const interiorCandidates = memberKeys.filter((key) => {
      const tile = tiles[key]
      const farEnough = (distanceToWater.get(key) ?? 0) >= 3
      return farEnough && tile.terrain !== 'mountains' && tile.terrain !== 'ocean' && tile.terrain !== 'coast'
    })
    if (interiorCandidates.length === 0) continue

    const mediumLakeCount = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < mediumLakeCount; i++) {
      if (interiorCandidates.length === 0) break
      const seedKey = interiorCandidates[Math.floor(rand() * interiorCandidates.length)]
      const seedCoord = coordsByKey.get(seedKey)!
      const size = 3 + Math.floor(rand() * 3)
      const blob = growBlob(
        seedCoord,
        size,
        (k) => {
          const t = tiles[k]
          return !!t && memberKeys.includes(k) && t.terrain !== 'mountains' && (distanceToWater.get(k) ?? 0) >= 2
        },
        rand,
        0.65,
      )
      for (const key of blob) {
        const tile = tiles[key]
        tile.terrain = 'lake'
        tile.vegetation = 'none'
        tile.hasHills = false
        tile.resource = 'none'
      }
    }
    if (compSize > 150 && rand() < 0.6) {
      const seedKey = interiorCandidates[Math.floor(rand() * interiorCandidates.length)]
      const seedCoord = coordsByKey.get(seedKey)!
      const size = 8 + Math.floor(rand() * 8)
      const blob = growBlob(
        seedCoord,
        size,
        (k) => {
          const t = tiles[k]
          return !!t && memberKeys.includes(k) && t.terrain !== 'mountains' && (distanceToWater.get(k) ?? 0) >= 2
        },
        rand,
        0.68,
      )
      for (const key of blob) {
        const tile = tiles[key]
        tile.terrain = 'lake'
        tile.vegetation = 'none'
        tile.hasHills = false
        tile.resource = 'none'
      }
    }
  }

  // ============================================================
  // STAGE 5: Resources — one overall roll per tile, weighted pick
  // among matching rules, single-tile occurrences (no spreading),
  // separate stricter chance for water tiles.
  // ============================================================
  const landByComponent = new Map<number, string[]>()
  for (const key of isLand) {
    const compId = componentOf.get(key)
    if (compId === undefined) continue
    if (!landByComponent.has(compId)) landByComponent.set(compId, [])
    landByComponent.get(compId)!.push(key)
  }

  const richnessZones = new Map<string, number>()
  for (const [, memberKeys] of landByComponent) {
    if (memberKeys.length < 60) continue
    if (rand() > 0.4) continue
    const center = coordsByKey.get(memberKeys[Math.floor(rand() * memberKeys.length)])!
    const memberSet = new Set(memberKeys)
    const zoneTiles = growBlob(center, 6 + Math.floor(rand() * 4), (k) => memberSet.has(k), rand, 0.6)
    for (const zk of zoneTiles) richnessZones.set(zk, 2.0)
  }

  const LAND_TILE_RESOURCE_CHANCE = 0.05
  const WATER_TILE_RESOURCE_CHANCE = 0.012

  function weightFor(tile: Tile, rule: (typeof RESOURCE_RULES)[number]): number {
    let w = rule.chance
    if (rule.boostTerrains && rule.boostTerrains.includes(tile.terrain) && rule.boostMultiplier) {
      w *= rule.boostMultiplier
    }
    return w
  }

  for (const coord of coords) {
    const key = tileKey(coord)
    const tile = tiles[key]
    if (tile.resource !== 'none') continue

    const isWater = tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'lake'
    const baseChance = isWater ? WATER_TILE_RESOURCE_CHANCE : LAND_TILE_RESOURCE_CHANCE
    const richness = richnessZones.get(key) ?? 1
    if (rand() > baseChance * richness) continue

    const hasRiver = tile.riverDirections.length > 0
    const matching = RESOURCE_RULES.filter((rule) =>
      tileMatchesRule(tile.terrain, tile.vegetation, tile.hasHills, hasRiver, rule),
    )
    if (matching.length === 0) continue

    const weights = matching.map((r) => weightFor(tile, r))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    if (totalWeight <= 0) continue

    let roll = rand() * totalWeight
    let chosen = matching[matching.length - 1]
    for (let i = 0; i < matching.length; i++) {
      roll -= weights[i]
      if (roll <= 0) {
        chosen = matching[i]
        break
      }
    }

    tile.resource = chosen.id
  }

  return tiles
}

export function findLandTilesNear(tiles: Record<string, Tile>, center: AxialCoord, radius: number): Tile[] {
  return Object.values(tiles).filter((t) => t.terrain !== 'ocean' && t.terrain !== 'lake' && hexDistance(t.coord, center) <= radius)
}
