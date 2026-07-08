import { AxialCoord, ResourceType, Tile, TerrainType } from './types'
import { generateMapCoords, hexDistance, neighbors, tileKey } from './hexGrid'

// Простой генератор "материков": не настоящий шум Перлина, а рост случайных
// пятен (blob growth) из нескольких зерён — этого достаточно, чтобы получить
// правдоподобную базу, которую потом правишь руками в World Builder.

interface GenOptions {
  width: number
  height: number
  landmassCount?: number // сколько "зёрен" материков
  landRatio?: number // примерная доля суши от общей площади
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateProceduralMap(
  options: GenOptions,
  seed = Date.now(),
): Record<string, Tile> {
  const { width, height } = options
  const landmassCount = options.landmassCount ?? Math.max(3, Math.round((width * height) / 4000))
  const landRatio = options.landRatio ?? 0.35

  const rand = mulberry32(seed)
  const coords = generateMapCoords(width, height)
  const tiles: Record<string, Tile> = {}

  for (const coord of coords) {
    tiles[tileKey(coord)] = {
      coord,
      terrain: 'ocean',
      vegetation: 'none',
      resource: 'none',
      ownerCivId: null,
      cityId: null,
    }
  }

  const targetLandCount = Math.floor(coords.length * landRatio)
  let landCount = 0

  // Растим материки: берём случайные зёрна, расширяем BFS-ом с затухающей
  // вероятностью, пока не наберём нужную долю суши.
  const seeds: AxialCoord[] = []
  for (let i = 0; i < landmassCount; i++) {
    const c = coords[Math.floor(rand() * coords.length)]
    seeds.push(c)
  }

  const frontier: AxialCoord[] = [...seeds]
  const visited = new Set<string>()

  while (frontier.length > 0 && landCount < targetLandCount) {
    const idx = Math.floor(rand() * frontier.length)
    const current = frontier.splice(idx, 1)[0]
    const key = tileKey(current)
    if (visited.has(key)) continue
    visited.add(key)

    const tile = tiles[key]
    if (!tile) continue

    if (tile.terrain === 'ocean') {
      tile.terrain = 'plains'
      landCount++
    }

    for (const n of neighbors(current)) {
      const nKey = tileKey(n)
      if (tiles[nKey] && !visited.has(nKey) && rand() < 0.72) {
        frontier.push(n)
      }
    }
  }

  // Прибрежная кайма: океан рядом с сушей -> coast
  for (const coord of coords) {
    const tile = tiles[tileKey(coord)]
    if (tile.terrain !== 'ocean') continue
    const hasLandNeighbor = neighbors(coord).some((n) => {
      const nt = tiles[tileKey(n)]
      return nt && nt.terrain !== 'ocean'
    })
    if (hasLandNeighbor) tile.terrain = 'coast'
  }

  // Разнообразие суши: холмы/горы/пустыня/тундра/снег по простым правилам
  for (const coord of coords) {
    const tile = tiles[tileKey(coord)]
    if (tile.terrain === 'ocean' || tile.terrain === 'coast') continue

    const roll = rand()
    const latitudeFactor = Math.abs(coord.r - height / 2) / (height / 2) // 0 = экватор, 1 = полюс

    if (latitudeFactor > 0.85) {
      tile.terrain = roll < 0.5 ? 'snow' : 'tundra'
    } else if (latitudeFactor > 0.6 && roll < 0.3) {
      tile.terrain = 'tundra'
    } else if (roll < 0.08) {
      tile.terrain = 'mountains'
    } else if (roll < 0.2) {
      tile.terrain = 'hills'
    } else if (roll < 0.28 && latitudeFactor < 0.4) {
      tile.terrain = 'desert'
    } else if (roll < 0.55) {
      tile.terrain = 'grassland'
    } else {
      tile.terrain = 'plains'
    }

    if (
      (tile.terrain === 'plains' || tile.terrain === 'grassland') &&
      rand() < 0.25
    ) {
      tile.vegetation = 'forest'
    }
  }

  // Немного ресурсов вразброс
  const resourceByTerrain: Partial<Record<TerrainType, ResourceType[]>> = {
    grassland: ['wheat', 'gold'],
    plains: ['wheat', 'horses'],
    hills: ['iron', 'gems'],
    desert: ['gems'],
    coast: ['fish'],
  }
  for (const coord of coords) {
    const tile = tiles[tileKey(coord)]
    const options = resourceByTerrain[tile.terrain]
    if (options && rand() < 0.06) {
      tile.resource = options[Math.floor(rand() * options.length)]
    }
  }

  return tiles
}

// На случай если понадобится найти клетку под старт цивилизации и т.п.
export function findLandTilesNear(
  tiles: Record<string, Tile>,
  center: AxialCoord,
  radius: number,
): Tile[] {
  return Object.values(tiles).filter(
    (t) => t.terrain !== 'ocean' && hexDistance(t.coord, center) <= radius,
  )
}
