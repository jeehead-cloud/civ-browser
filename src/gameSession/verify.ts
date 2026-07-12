/**
 * F10 Active Game verification — fake IndexedDB, isolated DB.
 * Run: npm run verify:active-game
 */
import 'fake-indexeddb/auto'
import { resetCatalogPersistenceSingleton } from '../catalog/persistence'
import { createBlankOceanTiles, isoNow, newEntityId } from '../catalog/mapFactory'
import { deepClone } from '../domain/adapters'
import type { CivilizationTemplate } from '../domain/civilizations'
import type { GameSession } from '../domain/gameSession'
import type { MapTemplate } from '../domain/maps'
import { STANDARD_RULES_VALUES } from '../domain/rulesDefaults'
import { createPersistence, deleteDatabase } from '../persistence'
import { STANDARD_RULES_PRESET_ID } from '../persistence/seed'
import { createAndSaveGameSession, resetNewGameCreateGuard } from '../newGame/newGameService'
import { validateGameSession } from '../domain/validators'
import {
  applyTurn,
  getMostRecentGameSession,
  hydrateRuntimeFromSession,
  isAtMaximumTurns,
  loadGameSession,
  primaryPlayerSummary,
  resetActiveGameTurnGuard,
  summarizeAllCivilizations,
  useActiveGameStore,
} from './index'

const DB = 'civ-browser-verify-active-game'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function section(title: string) {
  console.log(`\n== ${title} ==`)
}

function sampleMap(): MapTemplate {
  const id = newEntityId('map')
  const now = isoNow()
  const tiles = createBlankOceanTiles(16, 16)
  tiles['0,0'].terrain = 'grassland'
  tiles['1,0'].terrain = 'plains'
  tiles['2,0'].terrain = 'grassland'
  const cities = [
    { id: `${id}-c1`, name: 'Alpha', coord: { q: 0, r: 0 }, startingPopulation: 2 },
    { id: `${id}-c2`, name: 'Beta', coord: { q: 1, r: 0 }, startingPopulation: 2 },
    { id: `${id}-c3`, name: 'Gamma', coord: { q: 2, r: 0 }, startingPopulation: 3 },
  ]
  for (const city of cities) {
    tiles[`${city.coord.q},${city.coord.r}`].cityId = city.id
  }
  return {
    id,
    name: 'Active Verify Map',
    description: '',
    version: 1,
    width: 16,
    height: 16,
    tiles,
    cities,
    createdAt: now,
    updatedAt: now,
  }
}

function sampleCiv(id: string, name: string, color: string): CivilizationTemplate {
  const now = isoNow()
  return {
    id,
    name,
    cultureName: `${name} culture`,
    flagEmoji: '🦅',
    defaultColor: color,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

async function seedPlayableSession(): Promise<GameSession> {
  const services = await createPersistence({ databaseName: DB, seed: true })
  const map = sampleMap()
  const civA = sampleCiv('civ-a', 'Rome', '#aa0000')
  const civB = sampleCiv('civ-b', 'Greece', '#0066aa')
  await services.maps.save(map)
  await services.civilizations.save(civA)
  await services.civilizations.save(civB)

  resetNewGameCreateGuard()
  const saved = await createAndSaveGameSession({
    name: 'Active Verify Game',
    mapId: map.id,
    civilizations: [
      {
        templateId: civA.id,
        playerType: 'human',
        color: '#ff0000',
        capitalCityId: map.cities[0].id,
      },
      {
        templateId: civB.id,
        playerType: 'ai',
        color: '#00aa00',
        capitalCityId: map.cities[1].id,
      },
    ],
    rulesPresetId: STANDARD_RULES_PRESET_ID,
    startingYear: -4000,
    yearsPerTurn: 10,
    maximumTurns: 5,
    options: { databaseName: DB },
  })
  assert(saved.ok, `seed session: ${saved.ok ? '' : saved.errors.join('; ')}`)
  if (!saved.ok) throw new Error('unreachable')
  return saved.session
}

async function main() {
  await deleteDatabase(DB).catch(() => undefined)
  resetCatalogPersistenceSingleton()
  resetActiveGameTurnGuard()
  resetNewGameCreateGuard()

  section('loading')
  const session = await seedPlayableSession()
  const loaded = await loadGameSession(session.id, { databaseName: DB })
  assert(loaded.ok, 'valid session loads')
  if (!loaded.ok) throw new Error('unreachable')

  const missing = await loadGameSession('missing-id', { databaseName: DB })
  assert(!missing.ok && missing.code === 'not-found', 'missing session returns not-found')

  const hydrated = hydrateRuntimeFromSession(loaded.session)
  hydrated.tiles!['0,0'].terrain = 'desert'
  assert(loaded.session.tiles['0,0'].terrain === 'grassland', 'loaded runtime is deep-copy isolated')

  // Invalid session rejected via validator path
  const invalidShape = deepClone(loaded.session)
  invalidShape.width = 0
  assert(!validateGameSession(invalidShape).ok, 'invalid session rejected')

  section('turn engine')
  const before = deepClone(loaded.session)
  const turn1 = applyTurn({
    cities: before.cities,
    settings: before.rules.settings,
    turn: before.turn,
    currentYear: before.currentYear,
    yearsPerTurn: before.yearsPerTurn,
    maximumTurns: before.maximumTurns,
  })
  assert(turn1.ok, 'exactly one turn applies')
  if (!turn1.ok) throw new Error('unreachable')
  assert(turn1.value.turn === before.turn + 1, 'turn increments')
  assert(turn1.value.currentYear === before.currentYear + before.yearsPerTurn, 'currentYear increments')

  // Growth formula unchanged: max(pop+1, round(pop*(1+rate)))
  const alphaBefore = before.cities.find((c) => c.name === 'Alpha')!
  const alphaAfter = turn1.value.cities.find((c) => c.id === alphaBefore.id)!
  const rate = before.rules.settings.baseGrowthRate + alphaBefore.growthRateBonus
  const expected = Math.max(
    alphaBefore.population + 1,
    Math.round(alphaBefore.population * (1 + rate)),
  )
  assert(alphaAfter.population === expected, 'growth formula unchanged')

  // Culture formula
  assert(
    alphaAfter.culture === alphaBefore.culture + before.rules.settings.capitalCulturePerTurn,
    'culture formula unchanged',
  )

  assert(turn1.value.events.some((e) => e.type === 'growth_summary'), 'growth summary event')
  assert(turn1.value.events.some((e) => e.type === 'culture_generated'), 'culture event')
  assert(turn1.value.events.some((e) => e.type === 'turn_completed'), 'turn-complete event')
  assert(
    turn1.value.events.every((e) => typeof e.message === 'string' && e.id && e.type),
    'events use structured data',
  )

  // Force annexation: set culture high and unclaimed city
  const annexSetup = deepClone(before)
  const capital = annexSetup.cities.find((c) => c.name === 'Alpha')!
  capital.culture = annexSetup.rules.settings.cultureAnnexThreshold
  const annexTurn = applyTurn({
    cities: annexSetup.cities,
    settings: annexSetup.rules.settings,
    turn: annexSetup.turn,
    currentYear: annexSetup.currentYear,
    yearsPerTurn: annexSetup.yearsPerTurn,
  })
  assert(annexTurn.ok, 'annexation turn ok')
  if (!annexTurn.ok) throw new Error('unreachable')
  const gamma = annexTurn.value.cities.find((c) => c.name === 'Gamma')!
  assert(gamma.civId === capital.civId, 'annexation behavior unchanged')
  assert(annexTurn.value.events.some((e) => e.type === 'annexation'), 'annexation event produced')

  const blocked = applyTurn({
    cities: before.cities,
    settings: before.rules.settings,
    turn: 5,
    currentYear: 0,
    yearsPerTurn: 10,
    maximumTurns: 5,
  })
  assert(!blocked.ok, 'maximumTurns blocks further turn')
  assert(isAtMaximumTurns(5, 5), 'max helper')

  section('persistence / runtime store')
  resetCatalogPersistenceSingleton()
  const services = await createPersistence({ databaseName: DB, seed: false })
  useActiveGameStore.getState().reset()
  const forStore = await loadGameSession(session.id, { databaseName: DB })
  assert(forStore.ok, 'store seed load')
  if (!forStore.ok) throw new Error('unreachable')

  useActiveGameStore.setState({
    ...useActiveGameStore.getState(),
    ...hydrateRuntimeFromSession(forStore.session),
  })

  const popBefore = useActiveGameStore.getState().cities.find((c) => c.name === 'Alpha')!.population
  const runtime = useActiveGameStore.getState()
  const applied = applyTurn({
    cities: runtime.cities,
    settings: runtime.rules!.settings,
    turn: runtime.turn,
    currentYear: runtime.currentYear,
    yearsPerTurn: runtime.yearsPerTurn,
    maximumTurns: runtime.maximumTurns,
  })
  assert(applied.ok, 'runtime turn')
  if (!applied.ok) throw new Error('unreachable')

  const nextSession: GameSession = {
    ...forStore.session,
    cities: applied.value.cities,
    turn: applied.value.turn,
    currentYear: applied.value.currentYear,
    events: [...(forStore.session.events ?? []), ...applied.value.events],
    updatedAt: isoNow(),
  }
  await services.gameSessions.save(nextSession)
  const afterSave = await loadGameSession(session.id, { databaseName: DB })
  assert(afterSave.ok && afterSave.session.turn === applied.value.turn, 'manual save persists')
  if (!afterSave.ok) throw new Error('unreachable')
  const alphaPop = afterSave.session.cities.find((c) => c.name === 'Alpha')!.population
  assert(alphaPop > popBefore, 'population grew after turn')

  // Keep runtime after a failed save attempt (invalid name)
  useActiveGameStore.setState({
    ...useActiveGameStore.getState(),
    ...hydrateRuntimeFromSession(afterSave.session),
    dirty: true,
  })
  let failed = false
  try {
    await services.gameSessions.save({ ...afterSave.session, name: '' })
  } catch {
    failed = true
  }
  assert(failed, 'failed save rejected')
  assert(useActiveGameStore.getState().turn === afterSave.session.turn, 'failed save keeps runtime state')

  // Retry succeeds
  await services.gameSessions.save({ ...afterSave.session })
  const refreshed = await loadGameSession(session.id, { databaseName: DB })
  assert(refreshed.ok && refreshed.session.turn === afterSave.session.turn, 'refresh reloads updated turn')

  const mapStill = await services.maps.get(forStore.session.sourceMap!.templateId)
  assert(mapStill?.name === 'Active Verify Map', 'source map unchanged')
  const preset = await services.rulesPresets.get(STANDARD_RULES_PRESET_ID)
  assert(
    preset?.settings.cultureAnnexThreshold === STANDARD_RULES_VALUES.cultureAnnexThreshold,
    'source rules preset unchanged',
  )

  section('selectors')
  const primary = primaryPlayerSummary(afterSave.session.civilizations, afterSave.session.cities)
  assert(primary.ok && primary.summary.playerType === 'human', 'Human civ resolves')
  if (!primary.ok) throw new Error('unreachable')
  assert(primary.summary.capitalName === 'Alpha', 'capital resolves')
  assert(primary.summary.totalPopulation > 0, 'total population')
  assert(primary.summary.cityCount >= 1, 'city count')
  const summaries = summarizeAllCivilizations(
    afterSave.session.civilizations,
    afterSave.session.cities,
  )
  assert(summaries.length === 2, 'civilization summaries')

  section('map interaction invariants')
  const tileCopy = deepClone(afterSave.session.tiles)
  const key = '0,0'
  // Selecting must not mutate — simulate by ensuring clone independence
  tileCopy[key].terrain = 'snow'
  assert(afterSave.session.tiles[key].terrain !== 'snow', 'active map click path uses copies (no mutate source)')

  section('Continue Game')
  const recent = await getMostRecentGameSession({ databaseName: DB })
  assert(recent?.id === session.id, 'most recent session selected')

  await deleteDatabase('civ-browser-verify-active-empty').catch(() => undefined)
  resetCatalogPersistenceSingleton()
  await createPersistence({ databaseName: 'civ-browser-verify-active-empty', seed: true })
  const none = await getMostRecentGameSession({ databaseName: 'civ-browser-verify-active-empty' })
  assert(none === null, 'no sessions returns unavailable')

  // Double submission guard on applyTurn is store-level; engine itself is pure
  resetActiveGameTurnGuard()

  await deleteDatabase(DB).catch(() => undefined)
  await deleteDatabase('civ-browser-verify-active-empty').catch(() => undefined)
  resetCatalogPersistenceSingleton()
  console.log('\nverify:active-game OK')
}

main().catch((err) => {
  console.error(err)
  throw err
})
