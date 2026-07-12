import { catalogErrorMessage, getCatalogPersistence, type CatalogPersistenceOptions } from '../catalog/persistence'
import type { CivilizationTemplate } from '../domain/civilizations'
import type { MapTemplate } from '../domain/maps'
import type { GameRulesPreset } from '../domain/rules'
import { createGameSessionFromSetup } from './createGameSession'
import { validateNewGameSetup } from './setupValidation'
import type { NewGameSetupInput, SaveNewGameResult, WizardCivilizationSelection } from './types'

export type NewGamePersistenceOptions = CatalogPersistenceOptions

/** In-flight guard — one successful create per click path. */
let createInFlight = false

/** Test helper */
export function resetNewGameCreateGuard(): void {
  createInFlight = false
}

export async function loadMapsForWizard(
  options?: NewGamePersistenceOptions,
): Promise<MapTemplate[]> {
  const services = await getCatalogPersistence(options)
  return services.maps.list()
}

export async function loadCivilizationsForWizard(
  options?: NewGamePersistenceOptions,
): Promise<CivilizationTemplate[]> {
  const services = await getCatalogPersistence(options)
  return services.civilizations.list()
}

export async function loadRulesPresetsForWizard(
  options?: NewGamePersistenceOptions,
): Promise<GameRulesPreset[]> {
  const services = await getCatalogPersistence(options)
  return services.rulesPresets.list()
}

export async function getMapForWizard(
  id: string,
  options?: NewGamePersistenceOptions,
): Promise<MapTemplate | null> {
  const services = await getCatalogPersistence(options)
  return services.maps.get(id)
}

export async function getCivilizationForWizard(
  id: string,
  options?: NewGamePersistenceOptions,
): Promise<CivilizationTemplate | null> {
  const services = await getCatalogPersistence(options)
  return services.civilizations.get(id)
}

export async function getRulesPresetForWizard(
  id: string,
  options?: NewGamePersistenceOptions,
): Promise<GameRulesPreset | null> {
  const services = await getCatalogPersistence(options)
  return services.rulesPresets.get(id)
}

export async function getGameSession(
  id: string,
  options?: NewGamePersistenceOptions,
) {
  const services = await getCatalogPersistence(options)
  return services.gameSessions.get(id)
}

/**
 * Re-read all source records, validate, create session, save once, verify with get.
 */
export async function createAndSaveGameSession(input: {
  name: string
  mapId: string
  civilizations: WizardCivilizationSelection[]
  rulesPresetId: string
  startingYear: number
  yearsPerTurn: number
  maximumTurns: number | null
  options?: NewGamePersistenceOptions
}): Promise<SaveNewGameResult> {
  if (createInFlight) {
    return { ok: false, errors: ['Game creation is already in progress'], code: 'busy' }
  }
  createInFlight = true
  try {
    const services = await getCatalogPersistence(input.options)

    const map = await services.maps.get(input.mapId)
    if (!map) {
      return { ok: false, errors: ['Selected map no longer exists'], code: 'stale' }
    }

    const civEntries: NewGameSetupInput['civilizations'] = []
    for (const sel of input.civilizations) {
      const template = await services.civilizations.get(sel.templateId)
      if (!template) {
        return {
          ok: false,
          errors: [`Civilization “${sel.templateId}” no longer exists`],
          code: 'stale',
        }
      }
      if (!sel.capitalCityId) {
        return { ok: false, errors: [`${template.name}: capital is required`], code: 'validation' }
      }
      civEntries.push({
        template,
        playerType: sel.playerType,
        color: sel.color,
        capitalCityId: sel.capitalCityId,
      })
    }

    const rulesPreset = await services.rulesPresets.get(input.rulesPresetId)
    if (!rulesPreset) {
      return { ok: false, errors: ['Selected rules preset no longer exists'], code: 'stale' }
    }

    const setup: NewGameSetupInput = {
      name: input.name,
      map,
      civilizations: civEntries,
      rulesPreset,
      startingYear: input.startingYear,
      yearsPerTurn: input.yearsPerTurn,
      maximumTurns: input.maximumTurns ?? undefined,
    }

    const setupErrors = validateNewGameSetup(setup)
    if (setupErrors.length) {
      return { ok: false, errors: setupErrors, code: 'validation' }
    }

    const created = createGameSessionFromSetup(setup)
    if (!created.ok) {
      return { ok: false, errors: created.errors, code: 'validation' }
    }

    try {
      await services.gameSessions.save(created.session)
    } catch (err) {
      return {
        ok: false,
        errors: [catalogErrorMessage(err, 'Failed to save game session')],
        code: 'save',
      }
    }

    const verified = await services.gameSessions.get(created.session.id)
    if (!verified) {
      return {
        ok: false,
        errors: ['Game was saved but could not be reloaded'],
        code: 'save',
      }
    }

    return { ok: true, session: verified }
  } catch (err) {
    return {
      ok: false,
      errors: [catalogErrorMessage(err, 'Failed to create game')],
      code: 'save',
    }
  } finally {
    createInFlight = false
  }
}
