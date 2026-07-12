import type { CivilizationTemplate } from '../domain/civilizations'
import type { MapTemplate } from '../domain/maps'
import type { GameRulesPreset } from '../domain/rules'
import { validateCivilizationTemplate, validateGameRulesPreset, validateMapTemplate } from '../domain/validators'
import { GAME_NAME_MAX_LENGTH } from './constants'
import type { NewGameSetupInput, NewGameWizardState, WizardCivilizationSelection } from './types'

export function trimGameName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function defaultGameName(humanName: string | undefined, mapName: string | undefined): string {
  const human = humanName?.trim() || 'Civilization'
  const map = mapName?.trim() || 'Map'
  return `${human} — ${map}`.slice(0, GAME_NAME_MAX_LENGTH)
}

export function validateGameName(name: string): string[] {
  const trimmed = trimGameName(name)
  if (!trimmed) return ['Game name is required']
  if (trimmed.length > GAME_NAME_MAX_LENGTH) {
    return [`Game name must be at most ${GAME_NAME_MAX_LENGTH} characters`]
  }
  return []
}

export function validateTimeSettings(input: {
  startingYear: number
  yearsPerTurn: number
  maximumTurns: number | null | undefined
}): string[] {
  const errors: string[] = []
  if (!Number.isInteger(input.startingYear) || !Number.isFinite(input.startingYear)) {
    errors.push('Starting year must be a finite integer')
  }
  if (!Number.isInteger(input.yearsPerTurn) || input.yearsPerTurn < 1) {
    errors.push('Years per turn must be a positive integer')
  }
  if (input.maximumTurns != null) {
    if (!Number.isInteger(input.maximumTurns) || input.maximumTurns < 1) {
      errors.push('Maximum turns must be a positive integer when set')
    }
  }
  return errors
}

/** Step 1 — map selected, valid, and has at least one city for capitals. */
export function validateMapStep(map: MapTemplate | null | undefined): string[] {
  if (!map) return ['Select a map to continue']
  const validated = validateMapTemplate(map)
  if (!validated.ok) return validated.errors
  if (map.cities.length === 0) {
    return [
      'This map has no cities. Add cities in the World Editor before assigning capitals.',
    ]
  }
  return []
}

export function validateCivilizationSelections(
  selections: WizardCivilizationSelection[],
  templatesById: Map<string, CivilizationTemplate>,
  map: MapTemplate | null | undefined,
): string[] {
  const errors: string[] = []
  if (selections.length < 1) {
    errors.push('Add at least one civilization')
    return errors
  }

  const humans = selections.filter((s) => s.playerType === 'human')
  if (humans.length === 0) {
    errors.push('Exactly one civilization must be Human')
  } else if (humans.length > 1) {
    errors.push('Exactly one civilization must be Human (single-player)')
  }

  const templateIds = new Set<string>()
  for (const sel of selections) {
    if (templateIds.has(sel.templateId)) {
      errors.push(`Civilization ${sel.templateId} is selected more than once`)
    }
    templateIds.add(sel.templateId)

    const template = templatesById.get(sel.templateId)
    if (!template) {
      errors.push(`Civilization template ${sel.templateId} is missing from the catalog`)
      continue
    }
    const tv = validateCivilizationTemplate(template)
    if (!tv.ok) errors.push(...tv.errors)

    if (!sel.color?.trim()) {
      errors.push(`${template.name}: game color is required`)
    }

    if (!sel.capitalCityId) {
      errors.push(`${template.name}: assign a capital city`)
      continue
    }
    if (!map) {
      errors.push('A map is required to validate capital cities')
      continue
    }
    const city = map.cities.find((c) => c.id === sel.capitalCityId)
    if (!city) {
      errors.push(`${template.name}: capital is not on the selected map`)
    }
  }

  const capitalIds = selections.map((s) => s.capitalCityId).filter(Boolean) as string[]
  const seenCapitals = new Set<string>()
  for (const id of capitalIds) {
    if (seenCapitals.has(id)) {
      errors.push(`City ${id} is assigned as capital to more than one civilization`)
    }
    seenCapitals.add(id)
  }

  if (map && selections.length > map.cities.length) {
    errors.push('Not enough cities on the map for every civilization capital')
  }

  return errors
}

export function validateSettingsStep(
  preset: GameRulesPreset | null | undefined,
  time: { startingYear: number; yearsPerTurn: number; maximumTurns: number | null },
): string[] {
  const errors: string[] = []
  if (!preset) {
    errors.push('Select a rules preset')
  } else {
    const pv = validateGameRulesPreset(preset)
    if (!pv.ok) errors.push(...pv.errors)
  }
  errors.push(...validateTimeSettings(time))
  return errors
}

/** Full setup validation before session creation (sources already loaded). */
export function validateNewGameSetup(input: NewGameSetupInput): string[] {
  const errors: string[] = []
  errors.push(...validateGameName(input.name))
  errors.push(...validateMapStep(input.map))

  const selections: WizardCivilizationSelection[] = input.civilizations.map((c) => ({
    templateId: c.template.id,
    playerType: c.playerType,
    color: c.color,
    capitalCityId: c.capitalCityId,
  }))
  const templatesById = new Map(input.civilizations.map((c) => [c.template.id, c.template]))
  errors.push(...validateCivilizationSelections(selections, templatesById, input.map))
  errors.push(
    ...validateSettingsStep(input.rulesPreset, {
      startingYear: input.startingYear,
      yearsPerTurn: input.yearsPerTurn,
      maximumTurns: input.maximumTurns ?? null,
    }),
  )
  return errors
}

export function validateWizardStep(
  step: NewGameWizardState['step'],
  state: NewGameWizardState,
  sources: {
    map: MapTemplate | null
    templatesById: Map<string, CivilizationTemplate>
    preset: GameRulesPreset | null
  },
): string[] {
  if (step === 1) return validateMapStep(sources.map)
  if (step === 2) {
    return validateCivilizationSelections(state.civilizations, sources.templatesById, sources.map)
  }
  if (step === 3) {
    return validateSettingsStep(sources.preset, {
      startingYear: state.startingYear,
      yearsPerTurn: state.yearsPerTurn,
      maximumTurns: state.maximumTurns,
    })
  }
  // Review — full check using in-memory sources
  const mapErrors = validateMapStep(sources.map)
  if (mapErrors.length || !sources.map || !sources.preset) {
    return [
      ...mapErrors,
      ...(sources.preset ? [] : ['Select a rules preset']),
      ...validateCivilizationSelections(state.civilizations, sources.templatesById, sources.map),
      ...validateTimeSettings({
        startingYear: state.startingYear,
        yearsPerTurn: state.yearsPerTurn,
        maximumTurns: state.maximumTurns,
      }),
      ...validateGameName(state.gameName),
    ]
  }
  const civs = state.civilizations
    .map((sel) => {
      const template = sources.templatesById.get(sel.templateId)
      if (!template || !sel.capitalCityId) return null
      return {
        template,
        playerType: sel.playerType,
        color: sel.color,
        capitalCityId: sel.capitalCityId,
      }
    })
    .filter(Boolean) as NewGameSetupInput['civilizations']

  return validateNewGameSetup({
    name: state.gameName,
    map: sources.map,
    civilizations: civs,
    rulesPreset: sources.preset,
    startingYear: state.startingYear,
    yearsPerTurn: state.yearsPerTurn,
    maximumTurns: state.maximumTurns ?? undefined,
  })
}

/** Meaningful progress — leave warning after any real choice beyond untouched defaults. */
export function isWizardDirty(state: NewGameWizardState, defaults: {
  startingYear: number
  yearsPerTurn: number
  maximumTurns: number | null
  rulesPresetId: string | null
}): boolean {
  if (state.creationSucceeded) return false
  if (state.mapId) return true
  if (state.civilizations.length > 0) return true
  if (state.step > 1) return true
  if (state.gameNameTouched) return true
  if (state.startingYear !== defaults.startingYear) return true
  if (state.yearsPerTurn !== defaults.yearsPerTurn) return true
  if (state.maximumTurns !== defaults.maximumTurns) return true
  if (state.rulesPresetId && state.rulesPresetId !== defaults.rulesPresetId) return true
  return false
}
