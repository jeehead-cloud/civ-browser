import type { GameRulesValues } from '../domain/rules'
import { STANDARD_RULES_VALUES, RULES_VALUE_LIMITS } from '../domain/rulesDefaults'

export type RulesCategoryId =
  | 'cityDevelopment'
  | 'cultureInfluence'
  | 'economy'
  | 'science'
  | 'populationMood'
  | 'combat'
  | 'diplomacy'
  | 'ai'
  | 'greatPeople'
  | 'espionage'

export interface RulesCategoryDefinition {
  id: RulesCategoryId
  label: string
  active: boolean
}

export interface RulesParameterDefinition {
  key: keyof GameRulesValues
  category: RulesCategoryId
  label: string
  description: string
  unit: string
  inputType: 'number' | 'percentage'
  min: number
  max: number
  step: number
  defaultValue: number
  integer: boolean
}

export { STANDARD_RULES_VALUES }

export const RULES_CATEGORIES: RulesCategoryDefinition[] = [
  { id: 'cityDevelopment', label: 'City Development', active: true },
  { id: 'cultureInfluence', label: 'Culture & Influence', active: true },
  { id: 'economy', label: 'Economy', active: false },
  { id: 'science', label: 'Science & Technologies', active: false },
  { id: 'populationMood', label: 'Population & Mood', active: false },
  { id: 'combat', label: 'Combat', active: false },
  { id: 'diplomacy', label: 'Diplomacy', active: false },
  { id: 'ai', label: 'AI', active: false },
  { id: 'greatPeople', label: 'Great People', active: false },
  { id: 'espionage', label: 'Espionage', active: false },
]

/**
 * Declarative parameter catalog for Settings & Balance.
 * baseGrowthRate stored as decimal (0.01 = 1%); UI edits percent.
 */
export const RULES_PARAMETERS: RulesParameterDefinition[] = [
  {
    key: 'baseGrowthRate',
    category: 'cityDevelopment',
    label: 'Base city growth rate',
    description:
      'Population growth applied to every city each turn. Stored as a decimal rate (0.01 = 1%). Displayed and edited as a percentage.',
    unit: '%',
    inputType: 'percentage',
    min: RULES_VALUE_LIMITS.baseGrowthRate.min,
    max: RULES_VALUE_LIMITS.baseGrowthRate.max,
    step: 0.001,
    defaultValue: STANDARD_RULES_VALUES.baseGrowthRate,
    integer: RULES_VALUE_LIMITS.baseGrowthRate.integer,
  },
  {
    key: 'capitalCulturePerTurn',
    category: 'cultureInfluence',
    label: 'Capital culture per turn',
    description: 'Flat culture points a capital generates each turn toward annexation.',
    unit: 'points/turn',
    inputType: 'number',
    min: RULES_VALUE_LIMITS.capitalCulturePerTurn.min,
    max: RULES_VALUE_LIMITS.capitalCulturePerTurn.max,
    step: 1,
    defaultValue: STANDARD_RULES_VALUES.capitalCulturePerTurn,
    integer: RULES_VALUE_LIMITS.capitalCulturePerTurn.integer,
  },
  {
    key: 'cultureAnnexThreshold',
    category: 'cultureInfluence',
    label: 'Culture annexation threshold',
    description:
      'Culture a capital must accumulate to annex the nearest unclaimed city. Must be greater than zero.',
    unit: 'points',
    inputType: 'number',
    min: RULES_VALUE_LIMITS.cultureAnnexThreshold.min,
    max: RULES_VALUE_LIMITS.cultureAnnexThreshold.max,
    step: 1,
    defaultValue: STANDARD_RULES_VALUES.cultureAnnexThreshold,
    integer: RULES_VALUE_LIMITS.cultureAnnexThreshold.integer,
  },
]

export function parametersForCategory(categoryId: RulesCategoryId): RulesParameterDefinition[] {
  return RULES_PARAMETERS.filter((p) => p.category === categoryId)
}

export function getParameterDefinition(key: keyof GameRulesValues): RulesParameterDefinition {
  const def = RULES_PARAMETERS.find((p) => p.key === key)
  if (!def) throw new Error(`Missing parameter definition for ${key}`)
  return def
}

export function cloneRulesValues(settings: GameRulesValues): GameRulesValues {
  return {
    baseGrowthRate: settings.baseGrowthRate,
    capitalCulturePerTurn: settings.capitalCulturePerTurn,
    cultureAnnexThreshold: settings.cultureAnnexThreshold,
  }
}

export function settingsEqual(a: GameRulesValues, b: GameRulesValues): boolean {
  return (
    a.baseGrowthRate === b.baseGrowthRate &&
    a.capitalCulturePerTurn === b.capitalCulturePerTurn &&
    a.cultureAnnexThreshold === b.cultureAnnexThreshold
  )
}

export function storageToUiValue(def: RulesParameterDefinition, storage: number): number {
  if (def.inputType === 'percentage') return storage * 100
  return storage
}

export function uiToStorageValue(def: RulesParameterDefinition, ui: number): number {
  if (def.inputType === 'percentage') return ui / 100
  return ui
}

export function uiMin(def: RulesParameterDefinition): number {
  return storageToUiValue(def, def.min)
}

export function uiMax(def: RulesParameterDefinition): number {
  return storageToUiValue(def, def.max)
}

export function uiStep(def: RulesParameterDefinition): number {
  return storageToUiValue(def, def.step)
}

export function fieldChanged(
  key: keyof GameRulesValues,
  draft: GameRulesValues,
  persisted: GameRulesValues,
): boolean {
  return draft[key] !== persisted[key]
}

export function searchParameters(
  query: string,
  options?: {
    categoryId?: RulesCategoryId
    changedOnly?: boolean
    draft?: GameRulesValues
    persisted?: GameRulesValues
  },
): RulesParameterDefinition[] {
  const q = query.trim().toLowerCase()
  return RULES_PARAMETERS.filter((p) => {
    if (options?.categoryId && p.category !== options.categoryId) return false
    if (options?.changedOnly && options.draft && options.persisted) {
      if (!fieldChanged(p.key, options.draft, options.persisted)) return false
    }
    if (!q) return true
    return p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  })
}

export function resetField(settings: GameRulesValues, key: keyof GameRulesValues): GameRulesValues {
  const next = cloneRulesValues(settings)
  next[key] = getParameterDefinition(key).defaultValue
  return next
}

export function resetCategory(
  settings: GameRulesValues,
  categoryId: RulesCategoryId,
): GameRulesValues {
  let next = cloneRulesValues(settings)
  for (const p of parametersForCategory(categoryId)) {
    next = resetField(next, p.key)
  }
  return next
}

export function resetAllToDefaults(): GameRulesValues {
  return cloneRulesValues(STANDARD_RULES_VALUES)
}

export function validateSettingsAgainstDefinitions(settings: GameRulesValues): Partial<
  Record<keyof GameRulesValues, string>
> {
  const errors: Partial<Record<keyof GameRulesValues, string>> = {}
  for (const def of RULES_PARAMETERS) {
    const value = settings[def.key]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors[def.key] = 'Must be a finite number'
      continue
    }
    if (value < def.min || value > def.max) {
      if (def.inputType === 'percentage') {
        errors[def.key] = `Must be between ${uiMin(def)}% and ${uiMax(def)}%`
      } else {
        errors[def.key] = `Must be between ${def.min} and ${def.max}`
      }
      continue
    }
    if (def.integer && !Number.isInteger(value)) {
      errors[def.key] = 'Must be a whole number'
    }
  }
  return errors
}
