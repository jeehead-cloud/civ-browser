import type { CivilizationInstance } from '../domain/civilizations'
import type { GameCity, GameSession, GameSessionEvent } from '../domain/gameSession'

export interface CivSummary {
  id: string
  name: string
  flagEmoji: string
  color: string
  playerType: 'human' | 'ai'
  capitalName: string | null
  capitalCoord: { q: number; r: number } | null
  cityCount: number
  totalPopulation: number
  totalCulture: number
  capitalCulture: number
}

export function resolveHumanCivilization(
  civilizations: CivilizationInstance[],
): CivilizationInstance | null {
  const humans = civilizations.filter((c) => c.playerType === 'human')
  if (humans.length === 1) return humans[0]
  return null
}

export function cityForId(cities: GameCity[], id: string | null | undefined): GameCity | null {
  if (!id) return null
  return cities.find((c) => c.id === id) ?? null
}

export function summarizeCivilization(civ: CivilizationInstance, cities: GameCity[]): CivSummary {
  const owned = cities.filter((c) => c.civId === civ.id)
  const capital = cityForId(cities, civ.capitalCityId)
  return {
    id: civ.id,
    name: civ.name,
    flagEmoji: civ.flagEmoji,
    color: civ.color,
    playerType: civ.playerType,
    capitalName: capital?.name ?? null,
    capitalCoord: capital ? { ...capital.coord } : null,
    cityCount: owned.length,
    totalPopulation: owned.reduce((s, c) => s + c.population, 0),
    totalCulture: owned.reduce((s, c) => s + c.culture, 0),
    capitalCulture: capital?.culture ?? 0,
  }
}

export function summarizeAllCivilizations(
  civilizations: CivilizationInstance[],
  cities: GameCity[],
): CivSummary[] {
  return civilizations.map((c) => summarizeCivilization(c, cities))
}

export function primaryPlayerSummary(
  civilizations: CivilizationInstance[],
  cities: GameCity[],
): { ok: true; summary: CivSummary } | { ok: false; error: string } {
  const human = resolveHumanCivilization(civilizations)
  if (!human) {
    return {
      ok: false,
      error: civilizations.some((c) => c.playerType === 'human')
        ? 'Multiple Human civilizations — Active Game expects exactly one'
        : 'No Human civilization in this session',
    }
  }
  return { ok: true, summary: summarizeCivilization(human, cities) }
}

export function eventsNewestFirst(events: GameSessionEvent[]): GameSessionEvent[] {
  return [...events].reverse()
}

/** Build persistable GameSession from runtime fields. */
export function runtimeToGameSession(parts: {
  id: string
  name: string
  version: number
  sourceMap?: GameSession['sourceMap']
  width: number
  height: number
  tiles: GameSession['tiles']
  cities: GameCity[]
  civilizations: CivilizationInstance[]
  rules: GameSession['rules']
  turn: number
  currentYear: number
  yearsPerTurn: number
  maximumTurns?: number
  createdAt: string
  updatedAt: string
  events: GameSessionEvent[]
}): GameSession {
  return {
    id: parts.id,
    name: parts.name,
    version: parts.version,
    sourceMap: parts.sourceMap,
    width: parts.width,
    height: parts.height,
    tiles: parts.tiles,
    cities: parts.cities,
    civilizations: parts.civilizations,
    rules: parts.rules,
    turn: parts.turn,
    currentYear: parts.currentYear,
    yearsPerTurn: parts.yearsPerTurn,
    ...(parts.maximumTurns != null ? { maximumTurns: parts.maximumTurns } : {}),
    createdAt: parts.createdAt,
    updatedAt: parts.updatedAt,
    ...(parts.events.length ? { events: parts.events } : {}),
  }
}
