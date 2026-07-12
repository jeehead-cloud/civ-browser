import type { AxialCoord, Tile } from '../game/types'
import type { CivilizationInstance } from './civilizations'
import type { GameRulesSnapshot } from './rules'

/**
 * Mutable city state inside a GameSession.
 * Mirrors currently implemented legacy City fields (no speculative systems).
 */
export interface GameCity {
  id: string
  /** MapCityTemplate id when instantiated from a template; optional for legacy. */
  sourceCityTemplateId?: string
  name: string
  coord: AxialCoord
  civId: string | null
  population: number
  productionQueue: string[]
  culture: number
  isCapital: boolean
  growthRateBonus: number
}

/** Optional reference metadata for the map template that seeded this session. */
export interface GameSessionSourceMap {
  templateId: string
  templateVersion: number
  templateName: string
}

/**
 * Independent active / resumable game.
 * Map tiles, cities, civ instances, and rules are deep copies — not live template refs.
 */
export interface GameSession {
  id: string
  name: string
  version: number
  sourceMap?: GameSessionSourceMap
  width: number
  height: number
  tiles: Record<string, Tile>
  cities: GameCity[]
  civilizations: CivilizationInstance[]
  rules: GameRulesSnapshot
  turn: number
  currentYear: number
  yearsPerTurn: number
  /** Product plan allows a max-turn limit; optional until New Game / F9 wires it. */
  maximumTurns?: number
  createdAt: string
  updatedAt: string
}
