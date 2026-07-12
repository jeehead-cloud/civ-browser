import { AxialCoord, TerrainType, Tile } from '../types'
import { generateMapCoords, neighbors, tileKey } from '../hexGrid'
import {
  clearRiverEdgesOnTile,
  cloneTiles,
  isWaterTerrain,
} from './clone'
import { clearInvalidResource, vegetationCompatible } from './layerValidation'
import { mulberry32 } from './rng'
import { emptyResult, failResult, LayerMapContext, LayerOpResult, successResult } from './types'

const DIRS: AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

function generateSmoothField(
  coordsByKey: Map<string, AxialCoord>,
  rand: () => number,
  passes = 4,
): Map<string, number> {
  let field = new Map<string, number>()
  for (const key of coordsByKey.keys()) field.set(key, rand())
  for (let p = 0; p < passes; p++) {
    const next = new Map<string, number>()
    for (const [key, coord] of coordsByKey) {
      let sum = field.get(key)!
      let count = 1
      for (const n of neighbors(coord)) {
        const nVal = field.get(tileKey(n))
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

function latitudeFactor(coord: AxialCoord, height: number): number {
  // Approximate using r relative to map — same spirit as mapGenerator
  const mid = (height - 1) / 2
  return Math.min(1, Math.abs(coord.r - mid) / Math.max(1, mid))
}

/**
 * Base landscape only: ocean / coast / lake / biomes.
 * Never writes mountains, hills, rivers, vegetation, or resources.
 */
function generateBaseTerrainMap(
  width: number,
  height: number,
  seed: number,
): Map<string, TerrainType> {
  const rand = mulberry32(seed)
  const coords = generateMapCoords(width, height)
  const coordsByKey = new Map<string, AxialCoord>()
  for (const c of coords) coordsByKey.set(tileKey(c), c)

  const out = new Map<string, TerrainType>()
  for (const c of coords) out.set(tileKey(c), 'ocean')

  const landRatio = 0.35
  const landmassCount = Math.max(3, Math.round((width * height) / 4000))
  const targetLand = Math.round(coords.length * landRatio)
  const isLand = new Set<string>()

  const shapeNoise = generateSmoothField(coordsByKey, mulberry32(seed + 111), 2)
  const seeds: AxialCoord[] = []
  for (let i = 0; i < landmassCount; i++) {
    seeds.push(coords[Math.floor(rand() * coords.length)])
  }
  const frontier: AxialCoord[] = [...seeds]
  const visitedGrow = new Set(seeds.map(tileKey))
  for (const s of seeds) isLand.add(tileKey(s))

  while (frontier.length > 0 && isLand.size < targetLand) {
    const idx = Math.floor(rand() * frontier.length)
    const current = frontier.splice(idx, 1)[0]
    for (const d of DIRS) {
      const n = { q: current.q + d.q, r: current.r + d.r }
      const nKey = tileKey(n)
      if (!coordsByKey.has(nKey) || visitedGrow.has(nKey)) continue
      visitedGrow.add(nKey)
      const noise = shapeNoise.get(nKey) ?? 0.5
      if (rand() < 0.55 + (noise - 0.5) * 0.4) {
        isLand.add(nKey)
        frontier.push(n)
      }
    }
  }

  const islandCount = 2 + Math.floor(rand() * 3)
  for (let i = 0; i < islandCount; i++) {
    const candidate = coords[Math.floor(rand() * coords.length)]
    if (isLand.has(tileKey(candidate))) continue
    const size = 10 + Math.floor(rand() * 18)
    for (const k of growBlob(candidate, size, (k) => coordsByKey.has(k), rand, 0.65)) {
      isLand.add(k)
    }
  }

  // Enclosed water → lake
  const openOceanVisited = new Set<string>()
  const openOceanFrontier: AxialCoord[] = []
  for (const coord of coords) {
    const key = tileKey(coord)
    if (isLand.has(key)) continue
    const isBorder = neighbors(coord).some((n) => !coordsByKey.has(tileKey(n)))
    if (isBorder && !openOceanVisited.has(key)) {
      openOceanVisited.add(key)
      openOceanFrontier.push(coord)
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
  const enclosed: string[] = []
  for (const coord of coords) {
    const key = tileKey(coord)
    if (!isLand.has(key) && !openOceanVisited.has(key)) {
      enclosed.push(key)
      out.set(key, 'lake')
    }
  }

  // Coast band on ocean adjacent to land
  const COAST_RADIUS = 2
  const coastVisited = new Set<string>([...isLand, ...enclosed])
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
        out.set(nKey, 'coast')
        coastFrontier.push({ coord: n, dist: dist + 1 })
      }
    }
  }

  // Biomes on land (never mountains)
  const noiseField = generateSmoothField(coordsByKey, mulberry32(seed + 55), 4)
  const BANDS: { max: number; terrains: TerrainType[] }[] = [
    { max: 0.12, terrains: ['grassland', 'plains'] },
    { max: 0.35, terrains: ['plains', 'grassland'] },
    { max: 0.72, terrains: ['plains', 'grassland'] },
    { max: 0.88, terrains: ['tundra', 'plains'] },
    { max: 1.01, terrains: ['snow', 'tundra'] },
  ]
  const landArray = Array.from(isLand)
  for (const key of landArray) {
    const coord = coordsByKey.get(key)!
    const lat = latitudeFactor(coord, height)
    const noise = noiseField.get(key)!
    let bandIndex = BANDS.findIndex((b) => lat <= b.max)
    if (bandIndex === -1) bandIndex = BANDS.length - 1
    if (rand() < 0.08) {
      const delta = rand() < 0.5 ? -1 : 1
      bandIndex = Math.max(0, Math.min(BANDS.length - 1, bandIndex + delta))
    }
    const band = BANDS[bandIndex]
    out.set(key, band.terrains[noise < 0.5 ? 0 : 1])
  }

  // Deserts
  const moistureField = generateSmoothField(coordsByKey, mulberry32(seed + 7919), 5)
  const desertCandidates = landArray.filter((key) => {
    const lat = latitudeFactor(coordsByKey.get(key)!, height)
    return lat > 0.15 && lat <= 0.42
  })
  const desertCount = desertCandidates.length > 0 ? 1 + (rand() < 0.5 ? 1 : 0) : 0
  for (let i = 0; i < desertCount && desertCandidates.length > 0; i++) {
    const seedKey = desertCandidates[Math.floor(rand() * desertCandidates.length)]
    const seedCoord = coordsByKey.get(seedKey)!
    const maxSize = Math.min(80, Math.round(landArray.length * 0.04))
    const blob = growBlob(seedCoord, maxSize, (k) => isLand.has(k), rand, 0.68)
    for (const key of blob) {
      if ((moistureField.get(key) ?? 0) <= 0.5) out.set(key, 'desert')
    }
  }

  // Small interior lakes
  for (let i = 0; i < 3; i++) {
    if (landArray.length < 40) break
    const seedKey = landArray[Math.floor(rand() * landArray.length)]
    const seedCoord = coordsByKey.get(seedKey)!
    const blob = growBlob(seedCoord, 3 + Math.floor(rand() * 4), (k) => isLand.has(k), rand, 0.6)
    for (const key of blob) {
      out.set(key, 'lake')
      isLand.delete(key)
    }
  }

  return out
}

/**
 * Terrain-only generation.
 * Policy: skip city tiles; apply new base terrain; clean incompatible overlays on water;
 * preserve hills/rivers/features/resources on land when still valid; never place mountains.
 */
export function generateTerrainOnly(
  tiles: Record<string, Tile>,
  ctx: LayerMapContext,
): LayerOpResult {
  const seed = ctx.seed ?? Date.now()
  if (ctx.width <= 0 || ctx.height <= 0) return failResult('Invalid map dimensions')

  const expectedKeys = generateMapCoords(ctx.width, ctx.height).map(tileKey)
  if (expectedKeys.length !== Object.keys(tiles).length) {
    // Still allow if keys match subset — require same key set
  }
  for (const key of expectedKeys) {
    if (!tiles[key]) return failResult(`Missing tile key ${key}`)
  }

  const newTerrain = generateBaseTerrainMap(ctx.width, ctx.height, seed)
  const next = cloneTiles(tiles)
  let changed = 0
  let citiesSkipped = 0
  let resourcesCleared = 0
  let vegetationCleared = 0
  let hillsCleared = 0
  let riversCleared = 0

  for (const key of expectedKeys) {
    const tile = next[key]
    const desired = newTerrain.get(key)
    if (!desired || !tile) continue

    if (tile.cityId) {
      // Preserve city tiles entirely (policy B)
      if (isWaterTerrain(desired) && !isWaterTerrain(tile.terrain)) {
        citiesSkipped++
      }
      continue
    }

    const beforeTerrain = tile.terrain
    if (tile.terrain !== desired) {
      tile.terrain = desired
      changed++
    }

    if (isWaterTerrain(desired)) {
      if (tile.hasHills) {
        tile.hasHills = false
        hillsCleared++
        if (beforeTerrain === desired) changed++
      }
      if (tile.vegetation !== 'none') {
        tile.vegetation = 'none'
        vegetationCleared++
      }
      if (tile.resource !== 'none') {
        // Keep water-valid resources; clear land-only
        if (clearInvalidResource(tile)) resourcesCleared++
      }
      riversCleared += clearRiverEdgesOnTile(next, key)
    } else {
      // Land: never leave mountains from this op; if somehow mountains requested skip
      if (desired === 'mountains') {
        tile.terrain = 'plains'
      }
      if (tile.terrain === 'mountains') {
        // Existing mountains replaced by biome already via desired
      }
      if (tile.hasHills && tile.terrain === 'mountains') {
        tile.hasHills = false
        hillsCleared++
      }
      if (!vegetationCompatible(tile)) {
        tile.vegetation = 'none'
        vegetationCleared++
      }
      if (clearInvalidResource(tile)) resourcesCleared++
    }
  }

  // Recount changed tiles more accurately
  let tilesChanged = 0
  for (const key of expectedKeys) {
    const a = tiles[key]
    const b = next[key]
    if (
      a.terrain !== b.terrain ||
      a.vegetation !== b.vegetation ||
      a.hasHills !== b.hasHills ||
      a.resource !== b.resource ||
      a.riverDirections.length !== b.riverDirections.length ||
      a.riverDirections.some((d, i) => d !== b.riverDirections[i])
    ) {
      tilesChanged++
    }
  }

  if (tilesChanged === 0) {
    return emptyResult('Terrain generation produced no changes', [
      citiesSkipped ? `${citiesSkipped} city tiles skipped` : '',
    ].filter(Boolean))
  }

  const warnings: string[] = []
  if (citiesSkipped > 0) warnings.push(`${citiesSkipped} city tiles preserved (skipped water overwrite)`)

  return successResult(
    next,
    tilesChanged,
    `Terrain regenerated (${tilesChanged} tiles). Preserved cities, and land overlays where still valid.`,
    warnings,
    {
      seed,
      resourcesCleared,
      vegetationCleared,
      hillsCleared,
      riversCleared,
      citiesSkipped,
    },
  )
}
