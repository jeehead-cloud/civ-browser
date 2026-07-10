// Базовые игровые типы. Расширяй по мере развития правил.

export type TerrainType =
  | 'ocean'
  | 'coast'
  | 'lake'
  | 'plains'
  | 'grassland'
  | 'mountains'
  | 'desert'
  | 'tundra'
  | 'snow'

export type VegetationType = 'none' | 'forest' | 'jungle' | 'swamp'

export type ResourceType =
  | 'none'
  // bonus
  | 'wheat'
  | 'deer'
  | 'fish'
  | 'bananas'
  | 'stone'
  // luxury
  | 'gold'
  | 'silver'
  | 'gems'
  | 'marble'
  | 'ivory'
  | 'furs'
  | 'cotton'
  | 'dyes'
  | 'incense'
  | 'wine'
  | 'sugar'
  | 'spices'
  | 'citrus'
  | 'silk'
  | 'truffles'
  | 'whales'
  | 'pearls'
  | 'coral'
  | 'salt'
  | 'amber'
  // strategic
  | 'horses'
  | 'iron'
  | 'niter'
  | 'coal'
  | 'oil'
  | 'aluminum'
  | 'uranium'
  | 'rareEarths'
  | 'lithium'
  | 'naturalGas'
  | 'titanium'

export interface AxialCoord {
  q: number
  r: number
}

export interface Tile {
  coord: AxialCoord
  terrain: TerrainType
  vegetation: VegetationType
  resource: ResourceType
  ownerCivId: string | null
  cityId: string | null
  hasHills: boolean
  riverDirections: number[]
}

export type PlayerType = 'human' | 'ai'

export interface Civilization {
  id: string
  name: string
  color: string
  playerType: PlayerType
  cultureName: string // flavor text, e.g. "Египтяне", "Римляне"
  flagEmoji: string // e.g. "🦅" — will become a real icon/image later
  capitalCityId: string | null
}

export interface City {
  id: string
  civId: string | null // null = unclaimed / no civilization yet
  name: string
  coord: AxialCoord
  population: number
  productionQueue: string[]
  culture: number // accumulated culture points (mainly relevant for capitals)
  isCapital: boolean
  growthRateBonus: number // extra growth rate added to the global base, e.g. 0.005 = +0.5%
}

export interface Unit {
  id: string
  civId: string
  type: 'settler' | 'worker' | 'warrior' | 'archer'
  coord: AxialCoord
  movesLeft: number
}

export interface GameSettings {
  baseGrowthRate: number // e.g. 0.01 = +1% population per turn, applied to every city
  capitalCulturePerTurn: number // flat culture points a capital generates per turn
  cultureAnnexThreshold: number // culture a capital needs accumulated to annex a neighboring unclaimed city
}

export interface GameState {
  tiles: Record<string, Tile> // key = "q,r"
  cities: City[]
  units: Unit[]
  civilizations: Civilization[]
  turn: number
  settings: GameSettings
}
