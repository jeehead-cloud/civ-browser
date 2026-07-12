import type { GameRulesPreset, GameRulesValues } from '../domain/rules'
import { validateGameRulesPreset } from '../domain/validators'
import { STANDARD_RULES_PRESET_ID } from '../persistence/seed'
import { cloneRulesValues } from './parameterDefinitions'

export const PRESET_NAME_MAX_LENGTH = 80

export function newPresetId(): string {
  return `rules-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function isoNow(): string {
  return new Date().toISOString()
}

export function isStandardPresetId(id: string): boolean {
  return id === STANDARD_RULES_PRESET_ID
}

export function validatePresetName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required'
  if (trimmed.length > PRESET_NAME_MAX_LENGTH) {
    return `Name must be at most ${PRESET_NAME_MAX_LENGTH} characters`
  }
  return null
}

export function createPresetFromSource(input: {
  name: string
  settings: GameRulesValues
  id?: string
}): { ok: true; value: GameRulesPreset } | { ok: false; error: string } {
  const nameError = validatePresetName(input.name)
  if (nameError) return { ok: false, error: nameError }
  const now = isoNow()
  const preset: GameRulesPreset = {
    id: input.id ?? newPresetId(),
    name: input.name.trim(),
    version: 1,
    createdAt: now,
    updatedAt: now,
    settings: cloneRulesValues(input.settings),
  }
  const validated = validateGameRulesPreset(preset)
  if (!validated.ok) return { ok: false, error: validated.errors.join('; ') }
  return { ok: true, value: validated.value }
}

export function duplicatePreset(source: GameRulesPreset): GameRulesPreset {
  const result = createPresetFromSource({
    name: `${source.name} Copy`,
    settings: source.settings,
  })
  if (!result.ok) throw new Error(result.error)
  return result.value
}

export function sortPresets(presets: GameRulesPreset[]): GameRulesPreset[] {
  return [...presets].sort((a, b) => {
    if (a.id === STANDARD_RULES_PRESET_ID) return -1
    if (b.id === STANDARD_RULES_PRESET_ID) return 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}
