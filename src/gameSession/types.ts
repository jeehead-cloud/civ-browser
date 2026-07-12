import type { AxialCoord, Tile } from '../game/types'
import type { GameCity, GameSession, GameSessionEvent } from '../domain/gameSession'
import type { CivilizationInstance } from '../domain/civilizations'
import type { GameRulesSnapshot } from '../domain/rules'

export type { GameSessionEvent, GameSessionEventType } from '../domain/gameSession'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type ActivePanelTab = 'overview' | 'cities' | 'world'
export type ActiveLoadStatus = 'idle' | 'loading' | 'ready' | 'not-found' | 'error'

export interface ActiveRuntimeState {
  loadStatus: ActiveLoadStatus
  loadError: string | null
  sessionId: string | null
  name: string
  width: number
  height: number
  tiles: Record<string, Tile>
  cities: GameCity[]
  civilizations: CivilizationInstance[]
  rules: GameRulesSnapshot | null
  turn: number
  currentYear: number
  yearsPerTurn: number
  maximumTurns?: number
  createdAt: string | null
  updatedAt: string | null
  version: number
  sourceMap?: GameSession['sourceMap']
  /** Runtime + optionally persisted events (newest last). */
  events: GameSessionEvent[]
  selectedTileKey: string | null
  cameraFocus: { coord: AxialCoord; nonce: number } | null
  panelTab: ActivePanelTab
  saveStatus: SaveStatus
  lastSavedAt: string | null
  saveError: string | null
  turnBusy: boolean
  runtimeError: string | null
  dirty: boolean
}

export interface ApplyTurnResult {
  cities: GameCity[]
  turn: number
  currentYear: number
  events: GameSessionEvent[]
}
