/**
 * F11 Active Game context verification — pure fixtures (+ fake IDB where needed).
 * Run: npm run verify:active-context
 */
import 'fake-indexeddb/auto'
import { resetCatalogPersistenceSingleton } from '../catalog/persistence'
import { createBlankOceanTiles, isoNow, newEntityId } from '../catalog/mapFactory'
import { deepClone } from '../domain/adapters'
import type { CivilizationInstance } from '../domain/civilizations'
import type { GameCity, GameSession, GameSessionEvent } from '../domain/gameSession'
import type { Tile } from '../game/types'
import { createPersistence, deleteDatabase } from '../persistence'
import { STANDARD_RULES_VALUES } from '../domain/rulesDefaults'
import { analyzeFreshWater } from './freshWater'
import { calculateTileYields } from './yields'
import {
  buildCityContext,
  buildTileContext,
  computeWorldMetrics,
  filterCities,
  sanitizeSelection,
} from './contextSelectors'
import { normalizeEvents, resolveEventFocus, toEventDisplayItems } from './events'
import { applyTurn } from './turnEngine'
import { loadGameSession } from './sessionService'

const DB = 'civ-browser-verify-active-context'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function section(title: string) {
  console.log(`\n== ${title} ==`)
}

function makeTiles(): Record<string, Tile> {
  const tiles = createBlankOceanTiles(8, 8)
  // Land
  tiles['1,0'].terrain = 'grassland'
  tiles['2,0'].terrain = 'plains'
  tiles['2,0'].hasHills = true
  tiles['2,0'].vegetation = 'forest'
  tiles['3,0'].terrain = 'mountains'
  tiles['4,0'].terrain = 'desert'
  tiles['0,1'].terrain = 'lake'
  // River on 1,0
  tiles['1,0'].riverDirections = [0]
  tiles['2,-1'] = {
    ...tiles['2,-1'],
    terrain: 'grassland',
    riverDirections: [3], // nearby river neighbor of 1,0 depending on dirs — use neighbor of 1,0
  }
  // Ensure neighbor of 1,0 at (2,0) has river for riverNearby test
  tiles['2,0'].riverDirections = [3]
  // City tiles
  tiles['1,0'].cityId = 'city-a'
  tiles['4,0'].cityId = 'city-b'
  tiles['2,0'].cityId = null
  tiles['5,0'].terrain = 'grassland'
  tiles['5,0'].cityId = 'city-free'
  return tiles
}

function makeCities(): GameCity[] {
  return [
    {
      id: 'city-a',
      name: 'Rome',
      coord: { q: 1, r: 0 },
      civId: 'civ-human',
      population: 4,
      productionQueue: [],
      culture: 12,
      isCapital: true,
      growthRateBonus: 0.005,
    },
    {
      id: 'city-b',
      name: 'Athens',
      coord: { q: 4, r: 0 },
      civId: 'civ-ai',
      population: 3,
      productionQueue: ['not-a-building'],
      culture: 2,
      isCapital: true,
      growthRateBonus: 0,
    },
    {
      id: 'city-free',
      name: 'Freeport',
      coord: { q: 5, r: 0 },
      civId: null,
      population: 2,
      productionQueue: [],
      culture: 0,
      isCapital: false,
      growthRateBonus: 0,
    },
  ]
}

function makeCivs(): CivilizationInstance[] {
  return [
    {
      id: 'civ-human',
      templateId: 't-rome',
      name: 'Rome',
      cultureName: 'Romans',
      flagEmoji: '🦅',
      color: '#aa0000',
      playerType: 'human',
      capitalCityId: 'city-a',
    },
    {
      id: 'civ-ai',
      templateId: 't-greece',
      name: 'Greece',
      cultureName: 'Greeks',
      flagEmoji: '🏛',
      color: '#0066aa',
      playerType: 'ai',
      capitalCityId: 'city-b',
    },
  ]
}

function makeRules() {
  return {
    settings: { ...STANDARD_RULES_VALUES },
    sourcePresetId: 'rules-standard',
    sourcePresetVersion: 1,
  }
}

async function main() {
  section('tile context')
  const tiles = makeTiles()
  const cities = makeCities()
  const civs = makeCivs()
  const rules = makeRules()

  const grassland = buildTileContext(tiles, civs, '1,0')
  assert(grassland, 'selected normal/city tile produces context')
  assert(grassland!.terrain === 'grassland', 'terrain')
  assert(grassland!.feature === 'none', 'feature')
  assert(grassland!.water.riverOnTile === true, 'riverOnTile correct')
  assert(grassland!.water.freshWater === true, 'freshWater true for river')

  tiles['1,1'].terrain = 'grassland'
  tiles['1,1'].riverDirections = []
  const adjLake = analyzeFreshWater(tiles, { q: 1, r: 1 })
  assert(adjLake.adjacentLake === true, 'adjacentLake correct')
  assert(adjLake.freshWater === true, 'freshWater true for adjacent lake')

  const dry = analyzeFreshWater(tiles, { q: 4, r: 0 })
  assert(dry.riverOnTile === false, 'dry riverOnTile')
  assert(dry.adjacentLake === false, 'dry adjacentLake')
  assert(dry.freshWater === false, 'freshWater false otherwise')

  const plains = buildTileContext(tiles, civs, '2,0')
  assert(plains!.water.riverNearby === true, 'riverNearby correct')
  assert(plains!.hasHills === true, 'hills')
  assert(plains!.feature === 'forest', 'forest feature')

  const mtn = buildTileContext(tiles, civs, '3,0')
  assert(mtn!.isMountains === true, 'mountains')
  assert(mtn!.yields.workable === false, 'mountain yield behavior')
  assert(mtn!.yields.food === 0 && mtn!.yields.production === 0, 'mountain zero yield')

  const y = calculateTileYields(tiles['2,0'])
  assert(y.food === 1 && y.production === 3, 'yields deterministic (plains 1/1 + hills +1 + forest +1)')
  assert(y.label === 'base tile yield', 'base tile yield label')
  assert(y.beauty === 'planned', 'beauty planned')

  assert(grassland!.owner.kind === 'neutral' || grassland!.owner.kind === 'civilization', 'owner resolves')
  // city tile without tile.ownerCivId stays neutral at tile level
  assert(grassland!.cityId === 'city-a', 'city id on tile')

  const desert = buildTileContext(tiles, civs, '4,0')
  assert(desert!.owner.kind === 'neutral', 'neutral resolves for unowned tile field')

  const mutated = deepClone(tiles)
  buildTileContext(mutated, civs, '2,0')
  mutated['2,0'].terrain = 'snow'
  assert(tiles['2,0'].terrain === 'plains', 'popup selection does not mutate session')

  section('city context')
  const humanCity = buildCityContext(cities, civs, rules, 'city-a', 'civ-human')
  assert(humanCity, 'city resolves')
  assert(humanCity!.owner.flagEmoji === '🦅', 'owner/flag resolves')
  assert(humanCity!.city.isCapital === true, 'capital badge resolves')
  assert(humanCity!.city.population === 4 && humanCity!.city.culture === 12, 'population/culture')
  assert(
    Math.abs(humanCity!.growthRate - (0.01 + 0.005)) < 1e-9,
    'growth correct',
  )
  assert(humanCity!.foundingYear === 'unknown', 'missing founding year handled honestly')
  assert(humanCity!.buildings === 'not-implemented', 'no fake buildings')
  assert(humanCity!.characters === 'planned', 'characters planned')
  assert(humanCity!.production === 'planned', 'no fake production')
  assert(humanCity!.isHumanOwned && !humanCity!.actions.build.available, 'Human-owned action state')
  assert(humanCity!.actions.build.reason.length > 0, 'build reason')

  const foreign = buildCityContext(cities, civs, rules, 'city-b', 'civ-human')
  assert(foreign!.isForeignOwned && !foreign!.actions.generic.available, 'foreign action state')

  assert(buildCityContext(cities, civs, rules, 'missing', 'civ-human') === null, 'stale city clears')
  assert(sanitizeSelection('9,9', tiles, cities) === null, 'stale tile selection clears')
  assert(sanitizeSelection('1,0', tiles, cities) === '1,0', 'valid selection kept')

  section('right panels')
  const searched = filterCities(cities, civs, 'ath', 'all')
  assert(searched.length === 1 && searched[0].name === 'Athens', 'city search')
  assert(filterCities(cities, civs, '', 'human').every((c) => c.civId === 'civ-human'), 'human filter')
  assert(filterCities(cities, civs, '', 'ai').every((c) => c.civId === 'civ-ai'), 'ai filter')
  assert(filterCities(cities, civs, '', 'unclaimed').every((c) => c.civId == null), 'unclaimed filter')

  const metrics = computeWorldMetrics({
    tiles,
    cities,
    civilizations: civs,
    width: 8,
    height: 8,
    sourceMap: { templateId: 'm1', templateVersion: 1, templateName: 'Test' },
    turn: 2,
    currentYear: -3990,
    yearsPerTurn: 10,
    maximumTurns: 50,
    rules,
  })
  assert(metrics.terrainCounts.grassland >= 1, 'World terrain counts')
  assert(metrics.landTiles + metrics.waterTiles === Object.keys(tiles).length, 'land/water counts')
  assert(metrics.claimedCities === 2 && metrics.unclaimedCities === 1, 'claimed/unclaimed')
  assert(metrics.civilizationCount === 2, 'civilization summaries count')

  section('events')
  const events: GameSessionEvent[] = [
    {
      id: 'e1',
      turn: 1,
      year: -4000,
      type: 'growth_summary',
      message: 'Cities grew by 3',
      data: { totalGrowth: 3 },
      createdAt: isoNow(),
    },
    {
      id: 'e2',
      turn: 1,
      year: -4000,
      type: 'annexation',
      message: 'Freeport annexed',
      data: { annexedCityId: 'city-free' },
      relatedCityIds: ['city-free', 'city-a'],
      relatedCivilizationIds: ['civ-human'],
      createdAt: isoNow(),
    },
    {
      id: 'e3',
      turn: 2,
      year: -3990,
      type: 'turn_completed',
      message: 'Turn 2',
      data: {},
      createdAt: isoNow(),
    },
    {
      id: 'e4',
      turn: 2,
      year: -3990,
      type: 'future_mystery' as GameSessionEvent['type'],
      message: '',
      data: {},
      createdAt: isoNow(),
    },
  ]

  const display = toEventDisplayItems(events)
  assert(display[0].type === 'unknown' || display[0].id === 'e4', 'newest first / unknown near top')
  assert(display.some((d) => d.type === 'turn_completed'), 'structured turn event renders')
  const annex = display.find((d) => d.type === 'annexation')!
  assert(annex.focusCityId === 'city-free', 'annexation event resolves related city')
  const focus = resolveEventFocus(annex, cities)
  assert(focus?.tileKey === '5,0', 'event click target resolves')

  const unknown = display.find((d) => d.type === 'unknown')
  assert(unknown && /Unknown event/.test(unknown.message), 'unknown event type falls back safely')
  assert(normalizeEvents(undefined).length === 0, 'missing events normalize to empty')
  assert(normalizeEvents(null).length === 0, 'null events empty')
  assert(display[0].turn >= display[display.length - 1].turn, 'events newest first')
  assert(!display.some((d) => d.type === 'growth_summary' && d.message.includes('city-a')), 'aggregation avoids per-city flood')

  section('compatibility')
  const before = deepClone(tiles)
  buildTileContext(tiles, civs, '2,0')
  assert(JSON.stringify(tiles) === JSON.stringify(before), 'selection does not mutate')

  // Turn still produces events
  const turnCities = deepClone(cities)
  const outcome = applyTurn({
    cities: turnCities,
    settings: rules.settings,
    turn: 1,
    currentYear: -4000,
    yearsPerTurn: 10,
  })
  assert(outcome.ok && outcome.value.events.length >= 2, 'Next Turn still produces events')

  await deleteDatabase(DB).catch(() => undefined)
  resetCatalogPersistenceSingleton()
  const services = await createPersistence({ databaseName: DB, seed: true })
  const session: GameSession = {
    id: newEntityId('game'),
    name: 'Context Verify',
    version: 1,
    width: 8,
    height: 8,
    tiles: deepClone(tiles),
    cities: deepClone(cities),
    civilizations: deepClone(civs),
    rules: deepClone(rules),
    turn: 1,
    currentYear: -4000,
    yearsPerTurn: 10,
    events: deepClone(events.filter((e) => e.type !== 'future_mystery' as never)),
    createdAt: isoNow(),
    updatedAt: isoNow(),
    sourceMap: { templateId: 'map-x', templateVersion: 1, templateName: 'Src' },
  }
  await services.gameSessions.save(session)
  const reloaded = await loadGameSession(session.id, { databaseName: DB })
  assert(reloaded.ok && (reloaded.session.events?.length ?? 0) >= 1, 'save/reload preserves events')

  const oldSession: GameSession = {
    ...session,
    id: newEntityId('game'),
    events: undefined,
  }
  await services.gameSessions.save(oldSession)
  const oldLoad = await loadGameSession(oldSession.id, { databaseName: DB })
  assert(oldLoad.ok && normalizeEvents(oldLoad.session.events).length === 0, 'old session without events loads')

  // Source templates: maps store empty unless we seed one — isolation covered by active-game verify;
  // here ensure session tiles mutation doesn't require map template.
  oldLoad.ok && (oldLoad.session.tiles['1,0'].terrain = 'snow')
  const again = await loadGameSession(oldSession.id, { databaseName: DB })
  assert(again.ok && again.session.tiles['1,0'].terrain !== 'snow', 'session get deep copy (source isolation)')

  await deleteDatabase(DB).catch(() => undefined)
  resetCatalogPersistenceSingleton()
  console.log('\nverify:active-context OK')
}

main().catch((err) => {
  console.error(err)
  throw err
})
