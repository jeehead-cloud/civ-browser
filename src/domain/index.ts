/**
 * Domain layer (F2) — template vs session type boundaries and adapters.
 *
 * Runtime gameplay still uses legacy types in `src/game/types.ts` + Zustand.
 * Persistence (IndexedDB) is F3. Do not import this into UI until F3–F9 need it.
 */

export type { ConversionResult } from './result'
export { ok, fail } from './result'

export type { MapTemplate, MapCityTemplate } from './maps'
export type { CivilizationTemplate, CivilizationInstance } from './civilizations'
export type { GameRulesPreset, GameRulesSnapshot, GameRulesValues } from './rules'
export type { GameSession, GameCity, GameSessionSourceMap } from './gameSession'

export {
  deepClone,
  cloneTiles,
  cloneRulesValues,
  cityToMapCityTemplate,
  mapCityTemplateToGameCity,
  legacyMapToMapTemplate,
  civilizationToTemplate,
  civilizationTemplateToInstance,
  civilizationToInstance,
  settingsToRulesPreset,
  rulesPresetToSnapshot,
  settingsToRulesSnapshot,
  cityToGameCity,
  legacyToGameSession,
  gameSessionMapToMapTemplate,
} from './adapters'

export type {
  LegacyMapToTemplateInput,
  CivilizationInstanceSetup,
  LegacyToGameSessionInput,
} from './adapters'

export { runDomainVerification } from './verification'
export type { DomainVerificationReport } from './verification'
