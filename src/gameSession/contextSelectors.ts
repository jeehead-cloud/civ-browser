import type { CivilizationInstance } from '../domain/civilizations'
import type { GameCity, GameSession } from '../domain/gameSession'
import type { GameRulesSnapshot } from '../domain/rules'
import type { Tile, TerrainType } from '../game/types'
import { tileKey } from '../game/hexGrid'
import { analyzeFreshWater, type FreshWaterInfo } from './freshWater'
import { calculateTileYields, type TileYields } from './yields'
import { summarizeCivilization, type CivSummary } from './selectors'

export interface TileOwnerInfo {
  kind: 'civilization' | 'neutral' | 'unknown'
  civId: string | null
  name: string | null
  flagEmoji: string | null
  playerType: 'human' | 'ai' | null
}

export interface TileContextView {
  tileKey: string
  coord: { q: number; r: number }
  terrain: TerrainType
  feature: Tile['vegetation']
  hasHills: boolean
  isMountains: boolean
  resource: Tile['resource']
  water: FreshWaterInfo
  yields: TileYields
  owner: TileOwnerInfo
  /** City on this tile, if any — callers choose city vs tile popup. */
  cityId: string | null
}

export interface CityContextView {
  city: GameCity
  tileKey: string
  owner: TileOwnerInfo
  isHumanOwned: boolean
  isForeignOwned: boolean
  isUnclaimed: boolean
  growthRate: number
  baseGrowthRate: number
  foundingYear: 'unknown'
  buildings: 'not-implemented'
  characters: 'planned'
  production: 'planned'
  science: 'planned'
  mood: 'planned'
  actions: {
    build: { available: false; reason: string }
    generic: { available: false; reason: string }
  }
}

export type CityOwnershipFilter = 'all' | 'human' | 'ai' | 'unclaimed'

export interface WorldMetrics {
  mapName: string
  width: number
  height: number
  terrainCounts: Record<string, number>
  landTiles: number
  waterTiles: number
  cityCount: number
  claimedCities: number
  unclaimedCities: number
  civilizationCount: number
  turn: number
  currentYear: number
  yearsPerTurn: number
  maximumTurns?: number
  rulesSummary: string | null
  riverEdgeTiles: number
  resourceTiles: number
}

function resolveOwner(
  civId: string | null | undefined,
  civilizations: CivilizationInstance[],
): TileOwnerInfo {
  if (!civId) {
    return { kind: 'neutral', civId: null, name: null, flagEmoji: null, playerType: null }
  }
  const civ = civilizations.find((c) => c.id === civId)
  if (!civ) {
    return { kind: 'unknown', civId, name: null, flagEmoji: null, playerType: null }
  }
  return {
    kind: 'civilization',
    civId: civ.id,
    name: civ.name,
    flagEmoji: civ.flagEmoji,
    playerType: civ.playerType,
  }
}

/** Build tile popup data. Returns null if tile missing (stale selection). */
export function buildTileContext(
  tiles: Record<string, Tile>,
  civilizations: CivilizationInstance[],
  key: string,
): TileContextView | null {
  const tile = tiles[key]
  if (!tile) return null

  const owner = resolveOwner(tile.ownerCivId, civilizations)

  return {
    tileKey: key,
    coord: { ...tile.coord },
    terrain: tile.terrain,
    feature: tile.vegetation,
    hasHills: tile.hasHills,
    isMountains: tile.terrain === 'mountains',
    resource: tile.resource,
    water: analyzeFreshWater(tiles, tile.coord),
    yields: calculateTileYields(tile),
    owner,
    cityId: tile.cityId,
  }
}

export function buildCityContext(
  cities: GameCity[],
  civilizations: CivilizationInstance[],
  rules: GameRulesSnapshot | null,
  cityId: string,
  humanCivId: string | null,
): CityContextView | null {
  const city = cities.find((c) => c.id === cityId)
  if (!city) return null

  const owner = resolveOwner(city.civId, civilizations)
  const baseGrowthRate = rules?.settings.baseGrowthRate ?? 0
  const isHumanOwned = Boolean(humanCivId && city.civId === humanCivId)
  const isUnclaimed = city.civId == null
  const isForeignOwned = !isUnclaimed && !isHumanOwned

  return {
    city,
    tileKey: tileKey(city.coord),
    owner,
    isHumanOwned,
    isForeignOwned,
    isUnclaimed,
    growthRate: baseGrowthRate + city.growthRateBonus,
    baseGrowthRate,
    foundingYear: 'unknown',
    buildings: 'not-implemented',
    characters: 'planned',
    production: 'planned',
    science: 'planned',
    mood: 'planned',
    actions: {
      build: {
        available: false,
        reason: 'Buildings and production are not implemented yet',
      },
      generic: {
        available: false,
        reason: isHumanOwned
          ? 'City actions (embassy, trade, …) are planned'
          : 'Foreign city actions are planned',
      },
    },
  }
}

export function filterCities(
  cities: GameCity[],
  civilizations: CivilizationInstance[],
  query: string,
  ownership: CityOwnershipFilter,
): GameCity[] {
  const q = query.trim().toLowerCase()
  return cities.filter((city) => {
    if (ownership === 'unclaimed' && city.civId != null) return false
    if (ownership === 'human' || ownership === 'ai') {
      const civ = city.civId ? civilizations.find((c) => c.id === city.civId) : null
      if (!civ || civ.playerType !== ownership) return false
    }
    if (!q) return true
    const civ = city.civId ? civilizations.find((c) => c.id === city.civId) : null
    return (
      city.name.toLowerCase().includes(q) ||
      (civ?.name.toLowerCase().includes(q) ?? false) ||
      `${city.coord.q},${city.coord.r}`.includes(q)
    )
  })
}

const WATER: TerrainType[] = ['ocean', 'coast', 'lake']

export function computeWorldMetrics(input: {
  tiles: Record<string, Tile>
  cities: GameCity[]
  civilizations: CivilizationInstance[]
  width: number
  height: number
  sourceMap?: GameSession['sourceMap']
  turn: number
  currentYear: number
  yearsPerTurn: number
  maximumTurns?: number
  rules: GameRulesSnapshot | null
}): WorldMetrics {
  const terrainCounts: Record<string, number> = {}
  let landTiles = 0
  let waterTiles = 0
  let riverEdgeTiles = 0
  let resourceTiles = 0

  for (const tile of Object.values(input.tiles)) {
    terrainCounts[tile.terrain] = (terrainCounts[tile.terrain] ?? 0) + 1
    if (WATER.includes(tile.terrain)) waterTiles += 1
    else landTiles += 1
    if (tile.riverDirections.length > 0) riverEdgeTiles += 1
    if (tile.resource !== 'none') resourceTiles += 1
  }

  const claimedCities = input.cities.filter((c) => c.civId != null).length
  const rulesSummary = input.rules
    ? `growth ${input.rules.settings.baseGrowthRate}, culture ${input.rules.settings.capitalCulturePerTurn}/turn, annex ${input.rules.settings.cultureAnnexThreshold}`
    : null

  return {
    mapName: input.sourceMap?.templateName ?? 'Session map',
    width: input.width,
    height: input.height,
    terrainCounts,
    landTiles,
    waterTiles,
    cityCount: input.cities.length,
    claimedCities,
    unclaimedCities: input.cities.length - claimedCities,
    civilizationCount: input.civilizations.length,
    turn: input.turn,
    currentYear: input.currentYear,
    yearsPerTurn: input.yearsPerTurn,
    maximumTurns: input.maximumTurns,
    rulesSummary,
    riverEdgeTiles,
    resourceTiles,
  }
}

export function civDetailCities(
  civ: CivSummary,
  cities: GameCity[],
): GameCity[] {
  return cities.filter((c) => c.civId === civ.id)
}

export function buildCivSummaries(
  civilizations: CivilizationInstance[],
  cities: GameCity[],
): CivSummary[] {
  return civilizations.map((c) => summarizeCivilization(c, cities))
}

/** Clear stale selection when tile/city no longer exists. */
export function sanitizeSelection(
  selectedTileKey: string | null,
  tiles: Record<string, Tile>,
  cities: GameCity[],
): string | null {
  if (!selectedTileKey) return null
  const tile = tiles[selectedTileKey]
  if (!tile) return null
  if (tile.cityId && !cities.some((c) => c.id === tile.cityId)) {
    // City gone — keep tile selection if tile remains
    return selectedTileKey
  }
  return selectedTileKey
}

export type { FreshWaterInfo, TileYields, CivSummary }
