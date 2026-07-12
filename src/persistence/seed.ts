import type { GameRulesPreset } from '../domain/rules'
import type { RulesPresetRepository } from './repositories/types'

/** Stable seed id — must not change once shipped so seed stays idempotent. */
export const STANDARD_RULES_PRESET_ID = 'rules-standard'

const SEED_CREATED_AT = '2026-07-12T00:00:00.000Z'

export function createStandardRulesPreset(): GameRulesPreset {
  return {
    id: STANDARD_RULES_PRESET_ID,
    name: 'Standard',
    version: 1,
    createdAt: SEED_CREATED_AT,
    updatedAt: SEED_CREATED_AT,
    settings: {
      baseGrowthRate: 0.01,
      capitalCulturePerTurn: 1,
      cultureAnnexThreshold: 50,
    },
  }
}

/**
 * Idempotent seed: inserts the Standard rules preset only when missing.
 * Does not seed maps, civilizations, or game sessions.
 * Does not overwrite an existing Standard preset (user edits are preserved).
 */
export async function seedDefaults(rulesPresets: RulesPresetRepository): Promise<{
  seededRulesPreset: boolean
}> {
  const existing = await rulesPresets.get(STANDARD_RULES_PRESET_ID)
  if (existing) {
    return { seededRulesPreset: false }
  }
  await rulesPresets.save(createStandardRulesPreset())
  return { seededRulesPreset: true }
}
