import {
  civilizationTemplateToInstance,
  cloneTiles,
  deepClone,
  mapCityTemplateToGameCity,
  rulesPresetToSnapshot,
} from '../domain/adapters'
import type { GameSession } from '../domain/gameSession'
import { validateGameSession } from '../domain/validators'
import { fail, ok } from '../domain/result'
import { newEntityId, isoNow } from '../catalog/mapFactory'
import { trimGameName, validateNewGameSetup } from './setupValidation'
import type { CreateGameSessionResult, NewGameSetupInput } from './types'

/**
 * Pure GameSession factory — no React, no repository I/O.
 * Deep-copies map/civ/rules data; never mutates source templates or presets.
 */
export function createGameSessionFromSetup(input: NewGameSetupInput): CreateGameSessionResult {
  const setupErrors = validateNewGameSetup(input)
  if (setupErrors.length) return { ok: false, errors: setupErrors }

  const now = isoNow()
  const sessionId = newEntityId('game')

  // Instance ids are independent of template ids (stable within this session).
  const instances = input.civilizations.map((entry) => {
    const instanceId = newEntityId('gciv')
    return {
      entry,
      instance: civilizationTemplateToInstance(entry.template, {
        instanceId,
        playerType: entry.playerType,
        color: entry.color,
        capitalCityId: entry.capitalCityId,
      }),
    }
  })

  const cityOwnerByCapital = new Map<string, string>()
  for (const { entry, instance } of instances) {
    cityOwnerByCapital.set(entry.capitalCityId, instance.id)
  }

  const cities = input.map.cities.map((cityTemplate) => {
    const ownerId = cityOwnerByCapital.get(cityTemplate.id)
    if (ownerId) {
      return mapCityTemplateToGameCity(cityTemplate, {
        civId: ownerId,
        isCapital: true,
      })
    }
    return mapCityTemplateToGameCity(cityTemplate)
  })

  for (const { entry, instance } of instances) {
    const capital = cities.find((c) => c.id === entry.capitalCityId)
    if (!capital || capital.civId !== instance.id || !capital.isCapital) {
      return {
        ok: false,
        errors: [`Failed to assign capital ${entry.capitalCityId} to ${entry.template.name}`],
      }
    }
  }

  const tiles = cloneTiles(input.map.tiles)
  // Do not claim surrounding territory — only city ownership marks capitals.
  for (const tile of Object.values(tiles)) {
    tile.ownerCivId = null
  }

  const session: GameSession = {
    id: sessionId,
    name: trimGameName(input.name),
    version: 1,
    sourceMap: {
      templateId: input.map.id,
      templateVersion: input.map.version,
      templateName: input.map.name,
    },
    width: input.map.width,
    height: input.map.height,
    tiles,
    cities,
    civilizations: instances.map((i) => i.instance),
    rules: rulesPresetToSnapshot(input.rulesPreset),
    turn: 1,
    currentYear: input.startingYear,
    yearsPerTurn: input.yearsPerTurn,
    ...(input.maximumTurns != null ? { maximumTurns: input.maximumTurns } : {}),
    createdAt: now,
    updatedAt: now,
  }

  const validated = validateGameSession(session, { requireCompleteCapitals: true })
  if (!validated.ok) return { ok: false, errors: validated.errors }

  // Independence check helpers left to verify suite — return deep clone so callers
  // cannot accidentally retain shared refs from the factory locals.
  return { ok: true, session: deepClone(validated.value) }
}

/** Convenience for typed ConversionResult consumers. */
export function createGameSessionResult(input: NewGameSetupInput) {
  const result = createGameSessionFromSetup(input)
  if (!result.ok) return fail(result.errors)
  return ok(result.session)
}
