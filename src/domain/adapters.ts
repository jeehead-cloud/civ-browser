import type { City, Civilization, GameSettings, GameState, Tile } from '../game/types'
import type { CivilizationInstance, CivilizationTemplate } from './civilizations'
import type { GameCity, GameSession } from './gameSession'
import type { MapCityTemplate, MapTemplate } from './maps'
import type { GameRulesPreset, GameRulesSnapshot, GameRulesValues } from './rules'
import { fail, ok, type ConversionResult } from './result'
import {
  cityCoordOnMap,
  isFiniteNumber,
  validateRulesValues,
  validateUniqueIds,
} from './validators'

function isoNow(): string {
  return new Date().toISOString()
}

/** Deep-clone plain JSON-serializable values (tiles, cities, settings, …). */
export function deepClone<T>(value: T): T {
  return structuredClone(value)
}

export function cloneTiles(tiles: Record<string, Tile>): Record<string, Tile> {
  return deepClone(tiles)
}

export function cloneRulesValues(settings: GameRulesValues): GameRulesValues {
  return deepClone(settings)
}

// ---- Map / city templates ----

export function cityToMapCityTemplate(city: City): MapCityTemplate {
  return {
    id: city.id,
    name: city.name,
    coord: { ...city.coord },
    startingPopulation: city.population,
  }
}

export function mapCityTemplateToGameCity(
  template: MapCityTemplate,
  options?: {
    civId?: string | null
    isCapital?: boolean
    culture?: number
    growthRateBonus?: number
    productionQueue?: string[]
  },
): GameCity {
  return {
    id: template.id,
    sourceCityTemplateId: template.id,
    name: template.name,
    coord: { ...template.coord },
    civId: options?.civId ?? null,
    population: template.startingPopulation,
    productionQueue: options?.productionQueue ? [...options.productionQueue] : [],
    culture: options?.culture ?? 0,
    isCapital: options?.isCapital ?? false,
    growthRateBonus: options?.growthRateBonus ?? 0,
  }
}

export interface LegacyMapToTemplateInput {
  id: string
  name: string
  description?: string
  width: number
  height: number
  tiles: Record<string, Tile>
  cities: City[]
  version?: number
  createdAt?: string
  updatedAt?: string
}

export function legacyMapToMapTemplate(input: LegacyMapToTemplateInput): ConversionResult<MapTemplate> {
  const errors: string[] = []
  if (!input.id) errors.push('MapTemplate.id is required')
  if (!input.name) errors.push('MapTemplate.name is required')
  if (!Number.isInteger(input.width) || input.width <= 0) errors.push('width must be a positive integer')
  if (!Number.isInteger(input.height) || input.height <= 0) errors.push('height must be a positive integer')
  if (!input.tiles || typeof input.tiles !== 'object') errors.push('tiles are required')

  const cities = (input.cities ?? []).map(cityToMapCityTemplate)
  errors.push(...validateUniqueIds(cities.map((c) => c.id), 'cities'))

  for (const city of cities) {
    if (!Number.isFinite(city.startingPopulation) || city.startingPopulation < 1) {
      errors.push(`city ${city.id}: startingPopulation must be ≥ 1`)
    }
    if (input.tiles && !cityCoordOnMap(input.tiles, city.coord)) {
      errors.push(`city ${city.id}: coord ${city.coord.q},${city.coord.r} is not on the map`)
    }
  }

  if (errors.length) return fail(errors)

  const now = isoNow()
  const tiles = cloneTiles(input.tiles)
  // Templates are not owned by civilizations; clear session ownership on tiles.
  for (const tile of Object.values(tiles)) {
    tile.ownerCivId = null
  }

  return ok({
    id: input.id,
    name: input.name,
    description: input.description ?? '',
    version: input.version ?? 1,
    width: input.width,
    height: input.height,
    tiles,
    cities: deepClone(cities),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  })
}

// ---- Civilizations ----

export function civilizationToTemplate(
  civ: Civilization,
  meta?: { version?: number; createdAt?: string; updatedAt?: string; leader?: string },
): CivilizationTemplate {
  const now = isoNow()
  return {
    id: civ.id,
    name: civ.name,
    cultureName: civ.cultureName,
    flagEmoji: civ.flagEmoji,
    defaultColor: civ.color,
    leader: meta?.leader,
    version: meta?.version ?? 1,
    createdAt: meta?.createdAt ?? now,
    updatedAt: meta?.updatedAt ?? now,
  }
}

export interface CivilizationInstanceSetup {
  playerType: 'human' | 'ai'
  /** Required for a complete session; may be null while drafting. */
  capitalCityId: string | null
  /** Override instance id; defaults to template.id */
  instanceId?: string
  name?: string
  cultureName?: string
  flagEmoji?: string
  color?: string
}

export function civilizationTemplateToInstance(
  template: CivilizationTemplate,
  setup: CivilizationInstanceSetup,
): CivilizationInstance {
  return {
    id: setup.instanceId ?? template.id,
    templateId: template.id,
    name: setup.name ?? template.name,
    cultureName: setup.cultureName ?? template.cultureName,
    flagEmoji: setup.flagEmoji ?? template.flagEmoji,
    color: setup.color ?? template.defaultColor,
    playerType: setup.playerType,
    capitalCityId: setup.capitalCityId,
  }
}

export function civilizationToInstance(civ: Civilization): CivilizationInstance {
  return {
    id: civ.id,
    templateId: civ.id,
    name: civ.name,
    cultureName: civ.cultureName,
    flagEmoji: civ.flagEmoji,
    color: civ.color,
    playerType: civ.playerType,
    capitalCityId: civ.capitalCityId,
  }
}

// ---- Rules ----

export function settingsToRulesPreset(
  settings: GameSettings,
  meta: { id: string; name: string; version?: number; createdAt?: string; updatedAt?: string },
): ConversionResult<GameRulesPreset> {
  const values: GameRulesValues = {
    baseGrowthRate: settings.baseGrowthRate,
    capitalCulturePerTurn: settings.capitalCulturePerTurn,
    cultureAnnexThreshold: settings.cultureAnnexThreshold,
  }
  const errors = validateRulesValues(values, 'settings')
  if (!meta.id) errors.push('GameRulesPreset.id is required')
  if (!meta.name) errors.push('GameRulesPreset.name is required')
  if (errors.length) return fail(errors)

  const now = isoNow()
  return ok({
    id: meta.id,
    name: meta.name,
    version: meta.version ?? 1,
    createdAt: meta.createdAt ?? now,
    updatedAt: meta.updatedAt ?? now,
    settings: cloneRulesValues(values),
  })
}

export function rulesPresetToSnapshot(preset: GameRulesPreset): GameRulesSnapshot {
  return {
    settings: cloneRulesValues(preset.settings),
    sourcePresetId: preset.id,
    sourcePresetVersion: preset.version,
  }
}

export function settingsToRulesSnapshot(settings: GameSettings): ConversionResult<GameRulesSnapshot> {
  const values: GameRulesValues = {
    baseGrowthRate: settings.baseGrowthRate,
    capitalCulturePerTurn: settings.capitalCulturePerTurn,
    cultureAnnexThreshold: settings.cultureAnnexThreshold,
  }
  const errors = validateRulesValues(values, 'settings')
  if (errors.length) return fail(errors)
  return ok({ settings: cloneRulesValues(values) })
}

// ---- Session ----

export function cityToGameCity(city: City): GameCity {
  return {
    id: city.id,
    name: city.name,
    coord: { ...city.coord },
    civId: city.civId,
    population: city.population,
    productionQueue: [...city.productionQueue],
    culture: city.culture,
    isCapital: city.isCapital,
    growthRateBonus: city.growthRateBonus,
  }
}

export interface LegacyToGameSessionInput {
  id: string
  name: string
  width: number
  height: number
  game: GameState
  currentYear: number
  yearsPerTurn: number
  maximumTurns?: number
  sourceMap?: GameSession['sourceMap']
  version?: number
  createdAt?: string
  updatedAt?: string
  /**
   * When true, every civilization must have a capitalCityId pointing at a unique
   * owned capital city. Default false — MVP setup often has null capitals.
   */
  requireCompleteCapitals?: boolean
}

export function legacyToGameSession(input: LegacyToGameSessionInput): ConversionResult<GameSession> {
  const errors: string[] = []
  if (!input.id) errors.push('GameSession.id is required')
  if (!input.name) errors.push('GameSession.name is required')
  if (!Number.isInteger(input.width) || input.width <= 0) errors.push('width must be a positive integer')
  if (!Number.isInteger(input.height) || input.height <= 0) errors.push('height must be a positive integer')
  if (!isFiniteNumber(input.currentYear)) errors.push('currentYear must be a finite number')
  if (!isFiniteNumber(input.yearsPerTurn) || input.yearsPerTurn === 0) {
    errors.push('yearsPerTurn must be a non-zero finite number')
  }
  if (!Number.isInteger(input.game.turn) || input.game.turn < 1) {
    errors.push('turn must be an integer ≥ 1')
  }

  const rulesResult = settingsToRulesSnapshot(input.game.settings)
  if (!rulesResult.ok) errors.push(...rulesResult.errors)

  const cities = input.game.cities.map(cityToGameCity)
  const civilizations = input.game.civilizations.map(civilizationToInstance)

  errors.push(...validateUniqueIds(cities.map((c) => c.id), 'cities'))
  errors.push(...validateUniqueIds(civilizations.map((c) => c.id), 'civilizations'))

  for (const city of cities) {
    if (!cityCoordOnMap(input.game.tiles, city.coord)) {
      errors.push(`city ${city.id}: coord ${city.coord.q},${city.coord.r} is not on the map`)
    }
  }

  const capitalOwners = new Map<string, string>()
  for (const civ of civilizations) {
    if (civ.capitalCityId == null) {
      if (input.requireCompleteCapitals) {
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
    if (input.requireCompleteCapitals && capital.civId !== civ.id) {
      errors.push(`civilization ${civ.id}: capital city is not owned by this civilization`)
    }
  }

  if (errors.length || !rulesResult.ok) return fail(errors)

  const now = isoNow()
  return ok({
    id: input.id,
    name: input.name,
    version: input.version ?? 1,
    sourceMap: input.sourceMap ? deepClone(input.sourceMap) : undefined,
    width: input.width,
    height: input.height,
    tiles: cloneTiles(input.game.tiles),
    cities: deepClone(cities),
    civilizations: deepClone(civilizations),
    rules: rulesResult.value,
    turn: input.game.turn,
    currentYear: input.currentYear,
    yearsPerTurn: input.yearsPerTurn,
    maximumTurns: input.maximumTurns,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  })
}

/**
 * Build a MapTemplate from a GameSession map copy (editor / catalog save path later).
 * Strips session ownership from tiles; cities become MapCityTemplates.
 */
export function gameSessionMapToMapTemplate(
  session: GameSession,
  meta: { id: string; name: string; description?: string },
): ConversionResult<MapTemplate> {
  const fakeCities: City[] = session.cities.map((c) => ({
    id: c.id,
    civId: null,
    name: c.name,
    coord: c.coord,
    population: c.population,
    productionQueue: [],
    culture: 0,
    isCapital: false,
    growthRateBonus: 0,
  }))
  return legacyMapToMapTemplate({
    id: meta.id,
    name: meta.name,
    description: meta.description,
    width: session.width,
    height: session.height,
    tiles: session.tiles,
    cities: fakeCities,
  })
}
