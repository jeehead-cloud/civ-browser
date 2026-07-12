import type { CivilizationTemplate } from '../domain/civilizations'
import type { GameSession } from '../domain/gameSession'
import type { MapTemplate } from '../domain/maps'
import type { GameRulesPreset } from '../domain/rules'
import type { NewGameStepId } from './constants'

export type PlayerType = 'human' | 'ai'

/** Per-civilization choices inside the wizard (references template by id). */
export interface WizardCivilizationSelection {
  templateId: string
  playerType: PlayerType
  color: string
  capitalCityId: string | null
}

export interface NewGameWizardState {
  step: NewGameStepId
  mapId: string | null
  civilizations: WizardCivilizationSelection[]
  rulesPresetId: string | null
  startingYear: number
  yearsPerTurn: number
  /** null = omit maximumTurns on the created session */
  maximumTurns: number | null
  gameName: string
  /** When false, game name auto-fills from Human + map. */
  gameNameTouched: boolean
  /** After successful create+navigate, leave prompts must not fire. */
  creationSucceeded: boolean
}

/**
 * Explicit setup input for the pure session factory.
 * Callers must pass already-loaded source records (not live mutable refs to keep).
 */
export interface NewGameSetupInput {
  name: string
  map: MapTemplate
  civilizations: Array<{
    template: CivilizationTemplate
    playerType: PlayerType
    color: string
    capitalCityId: string
  }>
  rulesPreset: GameRulesPreset
  startingYear: number
  yearsPerTurn: number
  maximumTurns?: number
}

export type CreateGameSessionResult =
  | { ok: true; session: GameSession }
  | { ok: false; errors: string[] }

export type SaveNewGameResult =
  | { ok: true; session: GameSession }
  | { ok: false; errors: string[]; code?: 'validation' | 'stale' | 'save' | 'busy' }
