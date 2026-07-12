import { deepClone } from '../domain/adapters'
import type { CivilizationTemplate } from '../domain/civilizations'
import type { GameSession } from '../domain/gameSession'
import type { MapTemplate } from '../domain/maps'
import type { Tile } from '../game/types'
import { closeDatabase, deleteDatabase, openDatabase } from './database'
import { isPersistenceError } from './errors'
import { createPersistenceServices } from './repositories'
import { seedDefaults, STANDARD_RULES_PRESET_ID } from './seed'
import { DATABASE_SCHEMA_VERSION, STORE_NAMES } from './schema'

export interface PersistenceVerificationReport {
  ok: boolean
  checks: { name: string; pass: boolean; detail?: string }[]
}

function makeTile(q: number, r: number, terrain: Tile['terrain'] = 'grassland'): Tile {
  return {
    coord: { q, r },
    terrain,
    vegetation: 'none',
    resource: 'none',
    ownerCivId: null,
    cityId: null,
    hasHills: false,
    riverDirections: [],
  }
}

function sampleMap(id: string, name: string, updatedAt: string): MapTemplate {
  const tiles = {
    '0,0': makeTile(0, 0),
    '1,0': makeTile(1, 0, 'plains'),
  }
  tiles['0,0'].cityId = `${id}-city`
  return {
    id,
    name,
    description: 'verify map',
    version: 1,
    width: 2,
    height: 1,
    tiles,
    cities: [
      {
        id: `${id}-city`,
        name: 'Town',
        coord: { q: 0, r: 0 },
        startingPopulation: 3,
      },
    ],
    createdAt: updatedAt,
    updatedAt,
  }
}

function sampleCiv(id: string, name: string, updatedAt: string): CivilizationTemplate {
  return {
    id,
    name,
    cultureName: `${name} culture`,
    flagEmoji: '🦅',
    defaultColor: '#336699',
    version: 1,
    createdAt: updatedAt,
    updatedAt,
  }
}

function sampleSession(id: string, name: string, updatedAt: string): GameSession {
  const map = sampleMap(`map-for-${id}`, 'Session Map', updatedAt)
  return {
    id,
    name,
    version: 1,
    width: map.width,
    height: map.height,
    tiles: deepClone(map.tiles),
    cities: [
      {
        id: 'sess-city-1',
        sourceCityTemplateId: map.cities[0].id,
        name: 'Session Town',
        coord: { q: 0, r: 0 },
        civId: 'sess-civ-1',
        population: 4,
        productionQueue: [],
        culture: 0,
        isCapital: true,
        growthRateBonus: 0,
      },
    ],
    civilizations: [
      {
        id: 'sess-civ-1',
        templateId: 'civ-rome',
        name: 'Rome',
        cultureName: 'Romans',
        flagEmoji: '🦅',
        color: '#aa0000',
        playerType: 'human',
        capitalCityId: 'sess-city-1',
      },
    ],
    rules: {
      settings: {
        baseGrowthRate: 0.01,
        capitalCulturePerTurn: 1,
        cultureAnnexThreshold: 50,
      },
      sourcePresetId: STANDARD_RULES_PRESET_ID,
      sourcePresetVersion: 1,
    },
    turn: 1,
    currentYear: -4000,
    yearsPerTurn: 10,
    createdAt: updatedAt,
    updatedAt,
  }
}

/** Isolated IndexedDB checks (use a unique DB name; never the production DB). */
export async function runPersistenceVerification(
  databaseName = `civ-browser-verify-${Date.now()}`,
): Promise<PersistenceVerificationReport> {
  const checks: PersistenceVerificationReport['checks'] = []
  const record = (name: string, pass: boolean, detail?: string) => {
    checks.push({ name, pass, detail })
  }

  try {
    const db = await openDatabase(databaseName)
    record('database opens', db.isOpen())

    const tableNames = db.tables.map((t) => t.name).sort()
    const expected = Object.values(STORE_NAMES).slice().sort()
    record(
      'schema creates all four stores',
      JSON.stringify(tableNames) === JSON.stringify(expected),
      `tables=${tableNames.join(',')}; schemaVersion=${DATABASE_SCHEMA_VERSION}`,
    )

    const services = createPersistenceServices(db)

    const seed1 = await seedDefaults(services.rulesPresets)
    const seed2 = await seedDefaults(services.rulesPresets)
    const presetsAfterSeed = await services.rulesPresets.list()
    record(
      'seed is idempotent',
      seed1.seededRulesPreset === true &&
        seed2.seededRulesPreset === false &&
        presetsAfterSeed.filter((p) => p.id === STANDARD_RULES_PRESET_ID).length === 1,
    )

    // ---- Maps CRUD ----
    const mapA = sampleMap('map-a', 'Alpha', '2026-07-12T10:00:00.000Z')
    const mapB = sampleMap('map-b', 'Beta', '2026-07-12T12:00:00.000Z')
    const mapAInput = deepClone(mapA)
    await services.maps.save(mapA)
    record('save does not mutate map input', JSON.stringify(mapA) === JSON.stringify(mapAInput))

    const gotMap = await services.maps.get('map-a')
    record('map get returns entity', gotMap?.id === 'map-a' && gotMap.name === 'Alpha')
    if (gotMap) {
      gotMap.name = 'Mutated'
      const gotAgain = await services.maps.get('map-a')
      record(
        'mutating get result does not alter stored map',
        gotAgain?.name === 'Alpha',
      )
    }

    await services.maps.save(mapB)
    const mapList = await services.maps.list()
    record(
      'map list ordering is updatedAt descending',
      mapList.length === 2 && mapList[0].id === 'map-b' && mapList[1].id === 'map-a',
    )
    mapList[0].name = 'ListMutated'
    const mapList2 = await services.maps.list()
    record('list items are independent copies', mapList2[0].name === 'Beta')

    await services.maps.delete('map-a')
    record('map delete removes entity', (await services.maps.get('map-a')) === null)
    record('map not-found returns null', (await services.maps.get('missing-map')) === null)

    // ---- Civilizations CRUD ----
    const civ = sampleCiv('civ-rome', 'Rome', '2026-07-12T11:00:00.000Z')
    await services.civilizations.save(civ)
    record('civilization save/get', (await services.civilizations.get('civ-rome'))?.name === 'Rome')
    await services.civilizations.delete('civ-rome')
    record(
      'civilization delete / not-found',
      (await services.civilizations.get('civ-rome')) === null &&
        (await services.civilizations.get('nope')) === null,
    )
    await services.civilizations.save(civ)

    // ---- Rules presets CRUD ----
    const customPreset = {
      id: 'rules-custom',
      name: 'Custom',
      version: 1 as const,
      createdAt: '2026-07-12T09:00:00.000Z',
      updatedAt: '2026-07-12T13:00:00.000Z',
      settings: {
        baseGrowthRate: 0.02,
        capitalCulturePerTurn: 2,
        cultureAnnexThreshold: 40,
      },
    }
    await services.rulesPresets.save(customPreset)
    const rulesList = await services.rulesPresets.list()
    record(
      'rules preset list includes seed + custom, ordered by updatedAt',
      rulesList.length === 2 && rulesList[0].id === 'rules-custom',
    )
    await services.rulesPresets.delete('rules-custom')
    record(
      'rules preset delete leaves Standard seed',
      (await services.rulesPresets.get('rules-custom')) === null &&
        (await services.rulesPresets.get(STANDARD_RULES_PRESET_ID))?.id === STANDARD_RULES_PRESET_ID,
    )

    // ---- Game sessions CRUD ----
    const session = sampleSession('session-1', 'Test Game', '2026-07-12T14:00:00.000Z')
    await services.gameSessions.save(session)
    const gotSession = await services.gameSessions.get('session-1')
    record('game session save/get', gotSession?.id === 'session-1' && gotSession.turn === 1)

    // Template delete must not delete session
    await services.maps.save(mapB)
    await services.maps.delete('map-b')
    await services.civilizations.delete('civ-rome')
    const sessionAfterDeletes = await services.gameSessions.get('session-1')
    record(
      'template deletion does not delete saved session',
      sessionAfterDeletes?.id === 'session-1' && sessionAfterDeletes.cities.length === 1,
    )

    // Session / template independence after load
    if (sessionAfterDeletes) {
      sessionAfterDeletes.tiles['0,0'].terrain = 'desert'
      const sessionReload = await services.gameSessions.get('session-1')
      record(
        'session get returns deep copy',
        sessionReload?.tiles['0,0'].terrain !== 'desert',
      )
    }

    await services.gameSessions.delete('session-1')
    record('game session delete / not-found', (await services.gameSessions.get('session-1')) === null)

    // ---- Invalid entities rejected ----
    let rejected = false
    try {
      await services.maps.save({
        ...sampleMap('bad', 'Bad', '2026-07-12T10:00:00.000Z'),
        width: 0,
      })
    } catch (e) {
      rejected = isPersistenceError(e) && e.code === 'validation'
    }
    record('invalid entities are rejected', rejected)

    // ---- JSON serialization of persisted shapes ----
    await services.maps.save(sampleMap('map-json', 'Json', '2026-07-12T15:00:00.000Z'))
    const forJson = await services.maps.get('map-json')
    try {
      const text = JSON.stringify(forJson)
      const parsed = JSON.parse(text)
      record('JSON serialization remains successful', parsed.id === 'map-json')
    } catch (e) {
      record('JSON serialization remains successful', false, String(e))
    }

    await closeDatabase(databaseName)
    await deleteDatabase(databaseName)
    record('database can be closed/deleted after verification', true)
  } catch (e) {
    record(
      'verification completed without unexpected throw',
      false,
      e instanceof Error ? e.message : String(e),
    )
    try {
      await deleteDatabase(databaseName)
    } catch {
      // ignore cleanup failure
    }
  }

  return { ok: checks.every((c) => c.pass), checks }
}
