import {
  DEFAULT_MAXIMUM_TURNS,
  DEFAULT_STARTING_YEAR,
  DEFAULT_YEARS_PER_TURN,
  type NewGameStepId,
} from './constants'
import { defaultGameName } from './setupValidation'
import type { NewGameWizardState, PlayerType, WizardCivilizationSelection } from './types'

export function createInitialWizardState(rulesPresetId: string | null = null): NewGameWizardState {
  return {
    step: 1,
    mapId: null,
    civilizations: [],
    rulesPresetId,
    startingYear: DEFAULT_STARTING_YEAR,
    yearsPerTurn: DEFAULT_YEARS_PER_TURN,
    maximumTurns: DEFAULT_MAXIMUM_TURNS,
    gameName: '',
    gameNameTouched: false,
    creationSucceeded: false,
  }
}

function withAutoName(
  state: NewGameWizardState,
  names: { humanName?: string; mapName?: string },
): NewGameWizardState {
  if (state.gameNameTouched) return state
  return {
    ...state,
    gameName: defaultGameName(names.humanName, names.mapName),
  }
}

export function selectMap(
  state: NewGameWizardState,
  mapId: string,
  mapName: string,
  humanName?: string,
): NewGameWizardState {
  const mapChanged = state.mapId !== mapId
  const next: NewGameWizardState = {
    ...state,
    mapId,
    civilizations: mapChanged
      ? state.civilizations.map((c) => ({ ...c, capitalCityId: null }))
      : state.civilizations,
  }
  return withAutoName(next, { humanName, mapName })
}

export function clearMap(state: NewGameWizardState): NewGameWizardState {
  return {
    ...state,
    mapId: null,
    civilizations: state.civilizations.map((c) => ({ ...c, capitalCityId: null })),
  }
}

export function addCivilization(
  state: NewGameWizardState,
  selection: Omit<WizardCivilizationSelection, 'capitalCityId'> & { capitalCityId?: string | null },
  names: { humanName?: string; mapName?: string },
): NewGameWizardState {
  if (state.civilizations.some((c) => c.templateId === selection.templateId)) {
    return state
  }
  let civilizations = [
    ...state.civilizations,
    {
      templateId: selection.templateId,
      playerType: selection.playerType,
      color: selection.color,
      capitalCityId: selection.capitalCityId ?? null,
    },
  ]
  // Enforce exactly one Human: if adding as human, demote others to AI.
  if (selection.playerType === 'human') {
    civilizations = civilizations.map((c) =>
      c.templateId === selection.templateId ? c : { ...c, playerType: 'ai' as const },
    )
  } else if (!civilizations.some((c) => c.playerType === 'human') && civilizations.length === 1) {
    // First civ defaults to Human when none set yet (caller usually sets this).
  }
  return withAutoName({ ...state, civilizations }, names)
}

export function removeCivilization(
  state: NewGameWizardState,
  templateId: string,
  names: { humanName?: string; mapName?: string },
): NewGameWizardState {
  const civilizations = state.civilizations.filter((c) => c.templateId !== templateId)
  return withAutoName({ ...state, civilizations }, names)
}

export function setCivilizationPlayerType(
  state: NewGameWizardState,
  templateId: string,
  playerType: PlayerType,
  names: { humanName?: string; mapName?: string },
): NewGameWizardState {
  let civilizations = state.civilizations.map((c) =>
    c.templateId === templateId ? { ...c, playerType } : c,
  )
  if (playerType === 'human') {
    civilizations = civilizations.map((c) =>
      c.templateId === templateId ? c : { ...c, playerType: 'ai' as const },
    )
  }
  return withAutoName({ ...state, civilizations }, names)
}

export function setCivilizationColor(
  state: NewGameWizardState,
  templateId: string,
  color: string,
): NewGameWizardState {
  return {
    ...state,
    civilizations: state.civilizations.map((c) =>
      c.templateId === templateId ? { ...c, color } : c,
    ),
  }
}

export function setCivilizationCapital(
  state: NewGameWizardState,
  templateId: string,
  capitalCityId: string | null,
): NewGameWizardState {
  return {
    ...state,
    civilizations: state.civilizations.map((c) =>
      c.templateId === templateId ? { ...c, capitalCityId } : c,
    ),
  }
}

export function setRulesPresetId(state: NewGameWizardState, rulesPresetId: string): NewGameWizardState {
  return { ...state, rulesPresetId }
}

export function setStartingYear(state: NewGameWizardState, startingYear: number): NewGameWizardState {
  return { ...state, startingYear }
}

export function setYearsPerTurn(state: NewGameWizardState, yearsPerTurn: number): NewGameWizardState {
  return { ...state, yearsPerTurn }
}

export function setMaximumTurns(
  state: NewGameWizardState,
  maximumTurns: number | null,
): NewGameWizardState {
  return { ...state, maximumTurns }
}

export function setGameName(state: NewGameWizardState, gameName: string): NewGameWizardState {
  return { ...state, gameName, gameNameTouched: true }
}

export function goToStep(state: NewGameWizardState, step: NewGameStepId): NewGameWizardState {
  return { ...state, step }
}

export function markCreationSucceeded(state: NewGameWizardState): NewGameWizardState {
  return { ...state, creationSucceeded: true }
}

export function humanSelection(state: NewGameWizardState): WizardCivilizationSelection | undefined {
  return state.civilizations.find((c) => c.playerType === 'human')
}
