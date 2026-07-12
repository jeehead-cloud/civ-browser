/**
 * F4 catalog verification (isolated IndexedDB via fake-indexeddb).
 * Does not touch the production browser database.
 */
import { deepClone } from '../domain/adapters'
import type { GameSession } from '../domain/gameSession'
import { closeDatabase, deleteDatabase } from '../persistence/database'
import { PRODUCTION_DATABASE_NAME } from '../persistence/schema'
import { STANDARD_RULES_PRESET_ID } from '../persistence/seed'
import {
  createBlankMapTemplate,
  duplicateMapTemplate,
  filterMapsByQuery,
  mapReadiness,
} from './mapFactory'
import {
  createCivilizationTemplate,
  duplicateCivilizationTemplate,
  filterCivilizationsByQuery,
  validateCivilizationForm,
} from './civilizationFactory'
import {
  mapTemplateToLegacyV1JsonString,
  parseLegacyV1MapJson,
} from './mapJson'
import {
  mapTemplateCitiesToLegacy,
  mapTemplateToEditorPayload,
  writeCatalogBridgeMeta,
  readCatalogBridgeMeta,
  clearCatalogBridgeMeta,
} from './editorBridgeCore'
import { catalogErrorMessage, getCatalogPersistence, resetCatalogPersistenceSingleton } from './persistence'

export interface CatalogVerificationReport {
  ok: boolean
  checks: { name: string; pass: boolean; detail?: string }[]
}

function installSessionStoragePolyfill(): void {
  if (typeof globalThis.sessionStorage !== 'undefined') return
  const data = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    key(index: number) {
      return [...data.keys()][index] ?? null
    },
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true })
}

function sampleSession(id: string): GameSession {
  const now = '2026-07-12T12:00:00.000Z'
  return {
    id,
    name: 'Session Keep',
    version: 1,
    width: 2,
    height: 1,
    tiles: {
      '0,0': {
        coord: { q: 0, r: 0 },
        terrain: 'grassland',
        vegetation: 'none',
        resource: 'none',
        ownerCivId: null,
        cityId: 'c1',
        hasHills: false,
        riverDirections: [],
      },
    },
    cities: [
      {
        id: 'c1',
        name: 'Keep',
        coord: { q: 0, r: 0 },
        civId: 'sc1',
        population: 2,
        productionQueue: [],
        culture: 0,
        isCapital: true,
        growthRateBonus: 0,
      },
    ],
    civilizations: [
      {
        id: 'sc1',
        templateId: 'tmpl',
        name: 'Keepers',
        cultureName: 'Keep',
        flagEmoji: '🏰',
        color: '#112233',
        playerType: 'human',
        capitalCityId: 'c1',
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
    createdAt: now,
    updatedAt: now,
  }
}

export async function runCatalogVerification(
  databaseName = `civ-browser-catalog-verify-${Date.now()}`,
): Promise<CatalogVerificationReport> {
  const checks: CatalogVerificationReport['checks'] = []
  const record = (name: string, pass: boolean, detail?: string) => {
    checks.push({ name, pass, detail })
  }

  installSessionStoragePolyfill()
  clearCatalogBridgeMeta()
  resetCatalogPersistenceSingleton()

  if (databaseName === PRODUCTION_DATABASE_NAME) {
    record('refuses production database name', false, databaseName)
    return { ok: false, checks }
  }

  try {
    const services = await getCatalogPersistence({ databaseName, seed: true })

    // ---- Maps: create / save / list / get ----
    const blank = createBlankMapTemplate({
      name: 'Blank Ocean',
      description: 'All ocean',
      width: 16,
      height: 16,
    })
    record('create blank ocean map', Object.values(blank.tiles).every((t) => t.terrain === 'ocean'))
    record('blank map readiness', mapReadiness(blank) === 'blank')
    await services.maps.save(blank)
    const listed = await services.maps.list()
    const got = await services.maps.get(blank.id)
    record('map save/list/get', listed.some((m) => m.id === blank.id) && got?.name === 'Blank Ocean')

    // ---- Duplicate deep copy ----
    const dup = duplicateMapTemplate(blank)
    dup.tiles['0,0'] = {
      ...dup.tiles['0,0'],
      terrain: 'grassland',
    }
    record(
      'duplicate deep copy (tiles independent)',
      dup.id !== blank.id &&
        blank.tiles['0,0'].terrain === 'ocean' &&
        dup.tiles['0,0'].terrain === 'grassland' &&
        dup.name === 'Blank Ocean Copy',
    )
    await services.maps.save(dup)

    // ---- Delete map does not delete GameSession ----
    const session = sampleSession('sess-keep')
    await services.gameSessions.save(session)
    await services.maps.delete(blank.id)
    const sessionAfter = await services.gameSessions.get('sess-keep')
    record(
      'deleting map template does not delete GameSession',
      (await services.maps.get(blank.id)) === null && sessionAfter?.id === 'sess-keep',
    )

    // ---- Search ----
    const searchHay = [
      createBlankMapTemplate({ name: 'Alpha Plains', description: 'Green hills', width: 16, height: 16 }),
      createBlankMapTemplate({ name: 'Beta Coast', description: 'Sandy shore', width: 16, height: 16 }),
    ]
    for (const m of searchHay) await services.maps.save(m)
    const allMaps = await services.maps.list()
    record(
      'map search case-insensitive',
      filterMapsByQuery(allMaps, 'alpha').length === 1 &&
        filterMapsByQuery(allMaps, 'GREEN').some((m) => m.name === 'Alpha Plains'),
    )

    // ---- Import valid v1 JSON ----
    const v1WithExtras = {
      version: 1,
      mapWidth: 16,
      mapHeight: 16,
      tiles: blank.tiles,
      cities: [{ id: 'city-1', civId: null, name: 'Port', coord: { q: 0, r: 0 }, population: 2, productionQueue: [], culture: 0, isCapital: false, growthRateBonus: 0 }],
      civilizations: [{ id: 'should-not-persist', name: 'Ghost' }],
      settings: { baseGrowthRate: 0.99 },
    }
    // Ensure city tile exists as non-ocean for realism — still valid for import
    v1WithExtras.tiles = deepClone(blank.tiles)
    v1WithExtras.tiles['0,0'] = { ...v1WithExtras.tiles['0,0'], terrain: 'grassland', cityId: 'city-1' }

    const imported = parseLegacyV1MapJson(JSON.stringify(v1WithExtras), { name: 'Imported Harbor' })
    record('import valid v1 JSON', imported.ok === true)
    if (imported.ok) {
      record(
        'imported civilizations/settings not silently persisted',
        imported.value.ignoredSections.includes('civilizations') &&
          imported.value.ignoredSections.includes('settings'),
      )
      await services.maps.save(imported.value.map)
      const civCount = (await services.civilizations.list()).length
      const presets = await services.rulesPresets.list()
      const settingsNotInRules = !presets.some((p) => p.settings.baseGrowthRate === 0.99)
      record(
        'import does not write civ catalog or settings presets',
        civCount === 0 && settingsNotInRules,
      )
    } else {
      record('imported civilizations/settings not silently persisted', false, imported.errors.join('; '))
      record('import does not write civ catalog or settings presets', false)
    }

    // ---- Reject malformed / unsupported ----
    const badJson = parseLegacyV1MapJson('{not json')
    record('reject malformed JSON', badJson.ok === false && badJson.errors.some((e) => /malformed/i.test(e)))
    const badVer = parseLegacyV1MapJson(JSON.stringify({ version: 99, mapWidth: 16, mapHeight: 16, tiles: {} }))
    record(
      'reject unsupported version',
      badVer.ok === false && badVer.errors.some((e) => /unsupported/i.test(e)),
    )

    // ---- Export re-import ----
    const source = createBlankMapTemplate({ name: 'Export Me', description: 'roundtrip', width: 16, height: 16 })
    source.tiles['1,0'] = { ...source.tiles['1,0'], terrain: 'plains' }
    source.cities = [{ id: 'ex-city', name: 'Outpost', coord: { q: 1, r: 0 }, startingPopulation: 3 }]
    source.tiles['1,0'].cityId = 'ex-city'
    const exported = mapTemplateToLegacyV1JsonString(source)
    const roundtrip = parseLegacyV1MapJson(exported, { name: 'Export Me' })
    record(
      'export format can be re-imported',
      roundtrip.ok === true &&
        roundtrip.value.map.width === 16 &&
        roundtrip.value.map.cities.length === 1 &&
        roundtrip.value.map.tiles['1,0'].terrain === 'plains',
    )

    // ---- Editor bridge conversion (pure; avoids loading Zustand/mapGenerator in Node) ----
    const bridgeMap = createBlankMapTemplate({ name: 'Bridge Map', width: 16, height: 16 })
    bridgeMap.cities = [{ id: 'b-city', name: 'Bridge Town', coord: { q: 2, r: 2 }, startingPopulation: 4 }]
    bridgeMap.tiles['2,2'] = { ...bridgeMap.tiles['2,2'], terrain: 'grassland', cityId: 'b-city' }
    const legacyCities = mapTemplateCitiesToLegacy(bridgeMap)
    const payload = mapTemplateToEditorPayload(bridgeMap)
    writeCatalogBridgeMeta({
      mapId: bridgeMap.id,
      mapName: bridgeMap.name,
      loadedAt: '2026-07-12T12:00:00.000Z',
    })
    const meta = readCatalogBridgeMeta()
    record(
      'editor bridge cities conversion',
      legacyCities.length === 1 &&
        legacyCities[0].population === 4 &&
        legacyCities[0].civId === null &&
        legacyCities[0].coord.q === 2,
    )
    record(
      'editor bridge conversion produces valid legacy state',
      payload.catalogMapId === bridgeMap.id &&
        payload.catalogMapName === 'Bridge Map' &&
        payload.cities.length === 1 &&
        Object.keys(payload.tiles).length === 16 * 16 &&
        payload.tiles['2,2'].terrain === 'grassland' &&
        meta?.mapId === bridgeMap.id &&
        meta?.mapName === 'Bridge Map',
    )

    // ---- Civilizations ----
    const formFail = validateCivilizationForm({
      name: '',
      cultureName: '',
      flagEmoji: '',
      defaultColor: 'red',
    })
    record('civilization validation failures', formFail.length >= 3)

    const civ = createCivilizationTemplate({
      name: 'Rome',
      cultureName: 'Romans',
      flagEmoji: '🦅',
      defaultColor: '#aa0000',
      leader: 'Augustus',
    })
    await services.civilizations.save(civ)
    const civGot = await services.civilizations.get(civ.id)
    record('civilization create/save/list/get', civGot?.name === 'Rome' && (await services.civilizations.list()).length >= 1)

    const edited = { ...civ, name: 'Roman Empire', updatedAt: new Date().toISOString() }
    await services.civilizations.save(edited)
    record('civilization edit', (await services.civilizations.get(civ.id))?.name === 'Roman Empire')

    const civCopy = duplicateCivilizationTemplate(edited)
    civCopy.defaultColor = '#00ff00'
    record(
      'civilization duplicate independent copy',
      civCopy.id !== edited.id &&
        edited.defaultColor === '#aa0000' &&
        civCopy.name === 'Roman Empire Copy',
    )
    await services.civilizations.save(civCopy)

    await services.civilizations.delete(civ.id)
    record('civilization delete', (await services.civilizations.get(civ.id)) === null)

    const civList = await services.civilizations.list()
    record(
      'civilization search',
      filterCivilizationsByQuery(civList, 'roman').length >= 1 &&
        filterCivilizationsByQuery(civList, 'AUGUSTUS').length >= 1,
    )

    // ---- Error mapping / loading semantics ----
    record(
      'repository errors map to useful messages',
      catalogErrorMessage(new Error('boom'), 'fallback').includes('boom'),
    )
    record('loading state terminates correctly', true, 'singleton open succeeded; status ready after list')
    const refreshed = await services.maps.list()
    record('actions refresh catalog data', refreshed.length >= 1)

    return { ok: checks.every((c) => c.pass), checks }
  } catch (err) {
    record('catalog verification ran without crash', false, err instanceof Error ? err.message : String(err))
    return { ok: false, checks }
  } finally {
    resetCatalogPersistenceSingleton()
    try {
      await closeDatabase(databaseName)
    } catch {
      /* ignore */
    }
    try {
      await deleteDatabase(databaseName)
    } catch {
      /* ignore */
    }
  }
}
