import { hexDistance } from '../game/hexGrid'
import type { GameCity } from '../domain/gameSession'
import type { GameRulesValues } from '../domain/rules'
import { newEntityId, isoNow } from '../catalog/mapFactory'
import type { ApplyTurnResult, GameSessionEvent } from './types'

export type ApplyTurnOutcome =
  | { ok: true; value: ApplyTurnResult }
  | { ok: false; error: string }

/**
 * Pure turn simulation for GameSession cities.
 * Order matches PRODUCT_RULES / legacy store.endTurn:
 * 1) growth 2) capital culture 3) annexation 4) year+ 5) turn+
 * Formulas must not change.
 */
export function applyTurn(input: {
  cities: GameCity[]
  settings: GameRulesValues
  turn: number
  currentYear: number
  yearsPerTurn: number
  maximumTurns?: number
}): ApplyTurnOutcome {
  if (input.maximumTurns != null && input.turn >= input.maximumTurns) {
    return { ok: false, error: 'Maximum turns reached for this session' }
  }

  const settings = input.settings
  const now = isoNow()
  const events: GameSessionEvent[] = []

  const beforePop = new Map(input.cities.map((c) => [c.id, c.population]))

  // 1. Growth
  let cities = input.cities.map((city) => {
    const rate = settings.baseGrowthRate + city.growthRateBonus
    const grown = Math.max(city.population + 1, Math.round(city.population * (1 + rate)))
    return { ...city, population: grown }
  })

  const totalGrowth = cities.reduce(
    (sum, c) => sum + (c.population - (beforePop.get(c.id) ?? c.population)),
    0,
  )
  events.push({
    id: newEntityId('evt'),
    turn: input.turn,
    year: input.currentYear,
    type: 'growth_summary',
    message: `Cities grew by ${totalGrowth} population total`,
    data: { totalGrowth, cityCount: cities.length },
    createdAt: now,
  })

  // 2. Capital culture accumulation
  let cultureGenerated = 0
  cities = cities.map((city) => {
    if (city.isCapital && city.civId) {
      cultureGenerated += settings.capitalCulturePerTurn
      return { ...city, culture: city.culture + settings.capitalCulturePerTurn }
    }
    return city
  })
  if (cultureGenerated > 0) {
    events.push({
      id: newEntityId('evt'),
      turn: input.turn,
      year: input.currentYear,
      type: 'culture_generated',
      message: `Capitals generated ${cultureGenerated} culture`,
      data: {
        cultureGenerated,
        perCapital: settings.capitalCulturePerTurn,
      },
      createdAt: now,
    })
  }

  // 3. Annexation
  const unclaimedCities = () => cities.filter((c) => c.civId === null)

  for (const capital of cities.filter(
    (c) => c.isCapital && c.civId && c.culture >= settings.cultureAnnexThreshold,
  )) {
    const candidates = unclaimedCities()
    if (candidates.length === 0) continue
    let nearest: (typeof candidates)[number] | null = null
    let nearestDist = Infinity
    for (const candidate of candidates) {
      const dist = hexDistance(capital.coord, candidate.coord)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = candidate
      }
    }
    if (!nearest) continue
    const annexedId = nearest.id
    const capitalId = capital.id
    const civId = capital.civId!
    cities = cities.map((c) => {
      if (c.id === annexedId) return { ...c, civId }
      if (c.id === capitalId) return { ...c, culture: c.culture - settings.cultureAnnexThreshold }
      return c
    })
    const annexed = cities.find((c) => c.id === annexedId)!
    events.push({
      id: newEntityId('evt'),
      turn: input.turn,
      year: input.currentYear,
      type: 'annexation',
      message: `${annexed.name} annexed by capital culture`,
      data: {
        annexedCityId: annexedId,
        capitalCityId: capitalId,
        civilizationId: civId,
        distance: nearestDist,
        threshold: settings.cultureAnnexThreshold,
      },
      relatedCityIds: [annexedId, capitalId],
      relatedCivilizationIds: [civId],
      createdAt: now,
    })
  }

  const nextYear = input.currentYear + input.yearsPerTurn
  const nextTurn = input.turn + 1
  events.push({
    id: newEntityId('evt'),
    turn: nextTurn,
    year: nextYear,
    type: 'turn_completed',
    message: `Turn ${nextTurn} · Year ${nextYear}`,
    data: {
      previousTurn: input.turn,
      previousYear: input.currentYear,
      yearsPerTurn: input.yearsPerTurn,
    },
    createdAt: now,
  })

  return {
    ok: true,
    value: {
      cities,
      turn: nextTurn,
      currentYear: nextYear,
      events,
    },
  }
}

export function isAtMaximumTurns(turn: number, maximumTurns?: number): boolean {
  return maximumTurns != null && turn >= maximumTurns
}
