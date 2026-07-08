// Базовые игровые типы. Расширяй по мере развития правил.

export type TerrainType =
  | 'ocean'
  | 'coast'
  | 'plains'
  | 'grassland'
  | 'hills'
  | 'mountains'
  | 'desert'
  | 'tundra'
  | 'snow'

export type VegetationType = 'none' | 'forest' | 'jungle'

export type ResourceType =
  | 'none'
  // стратегические
  | 'iron'
  | 'horses'
  // роскошь
  | 'gold'
  | 'gems'
  // бонусные
  | 'wheat'
  | 'fish'

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
}

export type PlayerType = 'human' | 'ai'

export interface Civilization {
  id: string
  name: string
  color: string
  playerType: PlayerType
}

export interface City {
  id: string
  civId: string
  name: string
  coord: AxialCoord
  population: number
  productionQueue: string[]
}

export interface Unit {
  id: string
  civId: string
  type: 'settler' | 'worker' | 'warrior' | 'archer'
  coord: AxialCoord
  movesLeft: number
}

export interface GameState {
  tiles: Record<string, Tile> // key = "q,r"
  cities: City[]
  units: Unit[]
  civilizations: Civilization[]
  turn: number
}
