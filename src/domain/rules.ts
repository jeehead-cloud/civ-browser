/**
 * Currently implemented balance values.
 * Nested under `settings` so future categories (combat, science, …) can be
 * added beside this object without rewriting consumers of the growth trio.
 */
export interface GameRulesValues {
  baseGrowthRate: number
  capitalCulturePerTurn: number
  cultureAnnexThreshold: number
}

/** Reusable editable rules preset (catalog). */
export interface GameRulesPreset {
  id: string
  name: string
  version: number
  createdAt: string
  updatedAt: string
  settings: GameRulesValues
}

/**
 * Independent copy of rules embedded in a GameSession.
 * Mutating this must never mutate the source GameRulesPreset.
 */
export interface GameRulesSnapshot {
  settings: GameRulesValues
  /** Optional provenance only — not a live link. */
  sourcePresetId?: string
  sourcePresetVersion?: number
}
