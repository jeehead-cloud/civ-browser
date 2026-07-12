import type { GameRulesValues } from './rules'

/** Canonical Standard settings — shared by seed, validators, and Settings UI. */
export const STANDARD_RULES_VALUES: GameRulesValues = {
  baseGrowthRate: 0.01,
  capitalCulturePerTurn: 1,
  cultureAnnexThreshold: 50,
}

/** Storage-space limits aligned with Settings parameter definitions. */
export const RULES_VALUE_LIMITS: {
  [K in keyof GameRulesValues]: { min: number; max: number; integer: boolean }
} = {
  baseGrowthRate: { min: 0, max: 1, integer: false },
  capitalCulturePerTurn: { min: 0, max: 10_000, integer: true },
  cultureAnnexThreshold: { min: 1, max: 1_000_000, integer: true },
}
