/**
 * Domain layer (F2) — template vs session type boundaries and adapters.
 *
 * Runtime gameplay still uses legacy types in `src/game/types.ts` + Zustand.
 * Persistence lives in `src/persistence/` (F3) but is not wired into UI yet.
 */

export type { ConversionResult } from './result'
export { ok, fail } from './result'

export type { MapTemplate, MapCityTemplate } from './maps'
export type { CivilizationTemplate, CivilizationInstance } from './civilizations'
export type { GameRulesPreset, GameRulesSnapshot, GameRulesValues } from './rules'
export { STANDARD_RULES_VALUES, RULES_VALUE_LIMITS } from './rulesDefaults'
export type {
  GameSession,
  GameCity,
  GameSessionSourceMap,
  GameSessionEvent,
  GameSessionEventType,
} from './gameSession'

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

export {
  SUPPORTED_ENTITY_VERSION,
  validateMapTemplate,
  validateCivilizationTemplate,
  validateGameRulesPreset,
  validateGameSession,
  validateRulesValues,
} from './validators'

export { runDomainVerification } from './verification'
export type { DomainVerificationReport } from './verification'
