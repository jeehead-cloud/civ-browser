import { tileKey } from '../game/hexGrid'
import type { Tile } from '../game/types'
import type { CivilizationTemplate } from './civilizations'
import type { GameSession } from './gameSession'
import type { MapTemplate } from './maps'
import type { GameRulesPreset, GameRulesSnapshot, GameRulesValues } from './rules'
import { fail, ok, type ConversionResult } from './result'

/** Domain entity `version` field currently supported for persistence / adapters. */
export const SUPPORTED_ENTITY_VERSION = 1

export function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

export function validateRulesValues(settings: GameRulesValues, label = 'settings'): string[] {
  const errors: string[] = []
  if (!isFiniteNumber(settings.baseGrowthRate) || settings.baseGrowthRate < 0) {
    errors.push(`${label}.baseGrowthRate must be a finite number ≥ 0`)
  }
  if (!isFiniteNumber(settings.capitalCulturePerTurn) || settings.capitalCulturePerTurn < 0) {
    errors.push(`${label}.capitalCulturePerTurn must be a finite number ≥ 0`)
  }
  if (!isFiniteNumber(settings.cultureAnnexThreshold) || settings.cultureAnnexThreshold <= 0) {
    errors.push(`${label}.cultureAnnexThreshold must be a finite number > 0`)
  }
  return errors
}

export function validateUniqueIds(ids: string[], label: string): string[] {
  const seen = new Set<string>()
  const errors: string[] = []
  for (const id of ids) {
    if (!id) {
      errors.push(`${label} contains an empty id`)
      continue
    }
    if (seen.has(id)) errors.push(`${label} duplicate id: ${id}`)
    seen.add(id)
  }
  return errors
}

export function cityCoordOnMap(tiles: Record<string, Tile>, coord: { q: number; r: number }): boolean {
  return tiles[tileKey(coord)] != null
}

function validateEntityVersion(version: unknown, label: string): string[] {
  if (!Number.isInteger(version) || (version as number) < 1) {
    return [`${label}.version must be an integer ≥ 1`]
  }
  if ((version as number) > SUPPORTED_ENTITY_VERSION) {
    return [`${label}.version ${(version as number)} is newer than supported (${SUPPORTED_ENTITY_VERSION})`]
  }
  return []
}

function validateTimestamp(value: unknown, field: string): string[] {
  if (typeof value !== 'string' || value.trim() === '') {
    return [`${field} must be a non-empty ISO timestamp string`]
  }
  if (Number.isNaN(Date.parse(value))) {
    return [`${field} must be a parseable date string`]
  }
  return []
}

export function validateMapTemplate(map: MapTemplate): ConversionResult<MapTemplate> {
  const errors: string[] = []
  if (!map?.id) errors.push('MapTemplate.id is required')
  if (!map?.name) errors.push('MapTemplate.name is required')
  errors.push(...validateEntityVersion(map?.version, 'MapTemplate'))
  errors.push(...validateTimestamp(map?.createdAt, 'MapTemplate.createdAt'))
  errors.push(...validateTimestamp(map?.updatedAt, 'MapTemplate.updatedAt'))
  if (!Number.isInteger(map?.width) || map.width <= 0) errors.push('width must be a positive integer')
  if (!Number.isInteger(map?.height) || map.height <= 0) errors.push('height must be a positive integer')
  if (!map?.tiles || typeof map.tiles !== 'object') errors.push('tiles are required')

  const cities = map?.cities ?? []
  errors.push(...validateUniqueIds(cities.map((c) => c.id), 'cities'))
  for (const city of cities) {
    if (!Number.isFinite(city.startingPopulation) || city.startingPopulation < 1) {
      errors.push(`city ${city.id}: startingPopulation must be ≥ 1`)
    }
    if (map.tiles && !cityCoordOnMap(map.tiles, city.coord)) {
      errors.push(`city ${city.id}: coord ${city.coord.q},${city.coord.r} is not on the map`)
    }
  }

  if (errors.length) return fail(errors)
  return ok(map)
}

export function validateCivilizationTemplate(
  civ: CivilizationTemplate,
): ConversionResult<CivilizationTemplate> {
  const errors: string[] = []
  if (!civ?.id) errors.push('CivilizationTemplate.id is required')
  if (!civ?.name) errors.push('CivilizationTemplate.name is required')
  if (!civ?.cultureName) errors.push('CivilizationTemplate.cultureName is required')
  if (!civ?.flagEmoji) errors.push('CivilizationTemplate.flagEmoji is required')
  if (!civ?.defaultColor) errors.push('CivilizationTemplate.defaultColor is required')
  errors.push(...validateEntityVersion(civ?.version, 'CivilizationTemplate'))
  errors.push(...validateTimestamp(civ?.createdAt, 'CivilizationTemplate.createdAt'))
  errors.push(...validateTimestamp(civ?.updatedAt, 'CivilizationTemplate.updatedAt'))
  if (errors.length) return fail(errors)
  return ok(civ)
}

export function validateGameRulesPreset(preset: GameRulesPreset): ConversionResult<GameRulesPreset> {
  const errors: string[] = []
  if (!preset?.id) errors.push('GameRulesPreset.id is required')
  if (!preset?.name) errors.push('GameRulesPreset.name is required')
  errors.push(...validateEntityVersion(preset?.version, 'GameRulesPreset'))
  errors.push(...validateTimestamp(preset?.createdAt, 'GameRulesPreset.createdAt'))
  errors.push(...validateTimestamp(preset?.updatedAt, 'GameRulesPreset.updatedAt'))
  if (!preset?.settings) errors.push('GameRulesPreset.settings is required')
  else errors.push(...validateRulesValues(preset.settings, 'settings'))
  if (errors.length) return fail(errors)
  return ok(preset)
}

export function validateRulesSnapshot(rules: GameRulesSnapshot, label = 'rules'): string[] {
  if (!rules?.settings) return [`${label}.settings is required`]
  return validateRulesValues(rules.settings, `${label}.settings`)
}

export function validateGameSession(
  session: GameSession,
  options?: { requireCompleteCapitals?: boolean },
): ConversionResult<GameSession> {
  const errors: string[] = []
  if (!session?.id) errors.push('GameSession.id is required')
  if (!session?.name) errors.push('GameSession.name is required')
  errors.push(...validateEntityVersion(session?.version, 'GameSession'))
  errors.push(...validateTimestamp(session?.createdAt, 'GameSession.createdAt'))
  errors.push(...validateTimestamp(session?.updatedAt, 'GameSession.updatedAt'))
  if (!Number.isInteger(session?.width) || session.width <= 0) errors.push('width must be a positive integer')
  if (!Number.isInteger(session?.height) || session.height <= 0) errors.push('height must be a positive integer')
  if (!isFiniteNumber(session?.currentYear)) errors.push('currentYear must be a finite number')
  if (!isFiniteNumber(session?.yearsPerTurn) || session.yearsPerTurn === 0) {
    errors.push('yearsPerTurn must be a non-zero finite number')
  }
  if (!Number.isInteger(session?.turn) || session.turn < 1) errors.push('turn must be an integer ≥ 1')
  if (!session?.tiles || typeof session.tiles !== 'object') errors.push('tiles are required')
  errors.push(...validateRulesSnapshot(session?.rules))

  const cities = session?.cities ?? []
  const civilizations = session?.civilizations ?? []
  errors.push(...validateUniqueIds(cities.map((c) => c.id), 'cities'))
  errors.push(...validateUniqueIds(civilizations.map((c) => c.id), 'civilizations'))

  for (const city of cities) {
    if (session.tiles && !cityCoordOnMap(session.tiles, city.coord)) {
      errors.push(`city ${city.id}: coord ${city.coord.q},${city.coord.r} is not on the map`)
    }
  }

  const capitalOwners = new Map<string, string>()
  for (const civ of civilizations) {
    if (civ.capitalCityId == null) {
      if (options?.requireCompleteCapitals) {
        errors.push(`civilization ${civ.id}: capitalCityId is required`)
      }
      continue
    }
    const capital = cities.find((c) => c.id === civ.capitalCityId)
    if (!capital) {
      errors.push(`civilization ${civ.id}: capitalCityId ${civ.capitalCityId} is not a game city`)
      continue
    }
    if (capitalOwners.has(capital.id)) {
      errors.push(
        `city ${capital.id} is capital for both ${capitalOwners.get(capital.id)} and ${civ.id}`,
      )
    } else {
      capitalOwners.set(capital.id, civ.id)
    }
    if (options?.requireCompleteCapitals && capital.civId !== civ.id) {
      errors.push(`civilization ${civ.id}: capital city is not owned by this civilization`)
    }
  }

  if (errors.length) return fail(errors)
  return ok(session)
}
