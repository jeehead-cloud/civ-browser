/**
 * F9 New Game Wizard verification — fake IndexedDB, isolated DB.
 * Run: npm run verify:new-game
 */
import 'fake-indexeddb/auto'
import { resetCatalogPersistenceSingleton } from '../catalog/persistence'
import { createBlankOceanTiles, isoNow, newEntityId } from '../catalog/mapFactory'
import type { CivilizationTemplate } from '../domain/civilizations'
import type { MapTemplate } from '../domain/maps'
import type { GameRulesPreset } from '../domain/rules'
import { STANDARD_RULES_VALUES } from '../domain/rulesDefaults'
import { deepClone } from '../domain/adapters'
import { createPersistence, deleteDatabase } from '../persistence'
import { STANDARD_RULES_PRESET_ID } from '../persistence/seed'
import { createGameSessionFromSetup } from './createGameSession'
import {
  createAndSaveGameSession,
  getGameSession,
  loadCivilizationsForWizard,
  loadMapsForWizard,
  loadRulesPresetsForWizard,
  resetNewGameCreateGuard,
} from './newGameService'
import {
  defaultGameName,
  isWizardDirty,
  validateCivilizationSelections,
  validateGameName,
  validateMapStep,
  validateNewGameSetup,
  validateSettingsStep,
  validateTimeSettings,
} from './setupValidation'
import {
  addCivilization,
  createInitialWizardState,
  markCreationSucceeded,
  removeCivilization,
  selectMap,
  setCivilizationCapital,
  setCivilizationPlayerType,
} from './wizardState'
import {
  DEFAULT_MAXIMUM_TURNS,
  DEFAULT_STARTING_YEAR,
  DEFAULT_YEARS_PER_TURN,
} from './constants'

const DB = 'civ-browser-verify-new-game'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function section(title: string) {
  console.log(`\n== ${title} ==`)
}

function sampleMap(opts?: {
  id?: string
  name?: string
  cities?: MapTemplate['cities']
}): MapTemplate {
  const id = opts?.id ?? newEntityId('map')
  const now = isoNow()
  const tiles = createBlankOceanTiles(16, 16)
  tiles['0,0'].terrain = 'grassland'
  tiles['1,0'].terrain = 'plains'
  tiles['2,0'].terrain = 'grassland'
  const cities =
    opts?.cities ??
    ([
      { id: `${id}-c1`, name: 'Alpha', coord: { q: 0, r: 0 }, startingPopulation: 2 },
      { id: `${id}-c2`, name: 'Beta', coord: { q: 1, r: 0 }, startingPopulation: 2 },
      { id: `${id}-c3`, name: 'Gamma', coord: { q: 2, r: 0 }, startingPopulation: 2 },
    ] satisfies MapTemplate['cities'])
  for (const city of cities) {
    const key = `${city.coord.q},${city.coord.r}`
    if (tiles[key]) tiles[key].cityId = city.id
  }
  return {
    id,
    name: opts?.name ?? 'Verify Map',
    description: 'new-game verify',
    version: 1,
    width: 16,
    height: 16,
    tiles,
    cities,
    createdAt: now,
    updatedAt: now,
  }
}

function sampleCiv(id: string, name: string, color = '#336699'): CivilizationTemplate {
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

function samplePreset(id: string, name: string): GameRulesPreset {
  const now = isoNow()
  return {
    id,
    name,
    version: 1,
    createdAt: now,
    updatedAt: now,
    settings: { ...STANDARD_RULES_VALUES },
  }
}

async function main() {
  await deleteDatabase(DB).catch(() => undefined)
  resetCatalogPersistenceSingleton()
  resetNewGameCreateGuard()

  const services = await createPersistence({ databaseName: DB, seed: true })

  section('source loading')
  const emptyMaps = await loadMapsForWizard({ databaseName: DB })
  assert(emptyMaps.length === 0, 'maps load (empty ok)')
  const emptyCivs = await loadCivilizationsForWizard({ databaseName: DB })
  assert(emptyCivs.length === 0, 'civilizations load (empty ok)')
  const presets = await loadRulesPresetsForWizard({ databaseName: DB })
  assert(presets.some((p) => p.id === STANDARD_RULES_PRESET_ID), 'rules presets load (Standard)')

  const map = sampleMap()
  const zeroCityMap = sampleMap({
    id: newEntityId('map'),
    name: 'Empty Cities',
    cities: [],
  })
  const civA = sampleCiv('civ-a', 'Rome', '#aa0000')
  const civB = sampleCiv('civ-b', 'Greece', '#0066aa')
  await services.maps.save(map)
  await services.maps.save(zeroCityMap)
  await services.civilizations.save(civA)
  await services.civilizations.save(civB)

  const mapsLoaded = await loadMapsForWizard({ databaseName: DB })
  assert(mapsLoaded.length === 2, 'maps load')
  const civsLoaded = await loadCivilizationsForWizard({ databaseName: DB })
  assert(civsLoaded.length === 2, 'civilizations load')

  section('validation')
  assert(validateMapStep(null).length > 0, 'no map rejected')
  assert(validateMapStep(zeroCityMap).some((e) => /no cities/i.test(e)), 'zero-city map cannot proceed')
  assert(
    validateCivilizationSelections([], new Map(), map).some((e) => /at least one/i.test(e)),
    'no civilization rejected',
  )
  assert(
    validateCivilizationSelections(
      [{ templateId: civA.id, playerType: 'ai', color: '#111', capitalCityId: map.cities[0].id }],
      new Map([[civA.id, civA]]),
      map,
    ).some((e) => /Exactly one.*Human/i.test(e)),
    'no Human civilization rejected',
  )
  assert(
    validateCivilizationSelections(
      [
        {
          templateId: civA.id,
          playerType: 'human',
          color: '#111',
          capitalCityId: map.cities[0].id,
        },
        {
          templateId: civB.id,
          playerType: 'human',
          color: '#222',
          capitalCityId: map.cities[1].id,
        },
      ],
      new Map([
        [civA.id, civA],
        [civB.id, civB],
      ]),
      map,
    ).some((e) => /Exactly one.*Human/i.test(e)),
    'multiple Human civilizations rejected',
  )
  assert(
    validateCivilizationSelections(
      [{ templateId: civA.id, playerType: 'human', color: '#111', capitalCityId: null }],
      new Map([[civA.id, civA]]),
      map,
    ).some((e) => /capital/i.test(e)),
    'missing capital rejected',
  )
  assert(
    validateCivilizationSelections(
      [
        {
          templateId: civA.id,
          playerType: 'human',
          color: '#111',
          capitalCityId: map.cities[0].id,
        },
        {
          templateId: civB.id,
          playerType: 'ai',
          color: '#222',
          capitalCityId: map.cities[0].id,
        },
      ],
      new Map([
        [civA.id, civA],
        [civB.id, civB],
      ]),
      map,
    ).some((e) => /more than one/i.test(e)),
    'duplicate capital rejected',
  )
  assert(
    validateCivilizationSelections(
      [
        {
          templateId: civA.id,
          playerType: 'human',
          color: '#111',
          capitalCityId: 'not-on-map',
        },
      ],
      new Map([[civA.id, civA]]),
      map,
    ).some((e) => /not on the selected map/i.test(e)),
    'capital not on map rejected',
  )
  assert(validateSettingsStep(null, {
    startingYear: -4000,
    yearsPerTurn: 10,
    maximumTurns: null,
  }).some((e) => /preset/i.test(e)), 'missing preset rejected')
  assert(
    validateTimeSettings({ startingYear: 1.5, yearsPerTurn: 10, maximumTurns: null }).length > 0,
    'invalid time settings rejected (year)',
  )
  assert(
    validateTimeSettings({ startingYear: -4000, yearsPerTurn: 0, maximumTurns: null }).length > 0,
    'invalid time settings rejected (years/turn)',
  )
  assert(validateGameName('').length > 0, 'empty game name rejected')
  assert(validateGameName('   ').length > 0, 'whitespace game name rejected')

  section('session creation')
  const preset = presets.find((p) => p.id === STANDARD_RULES_PRESET_ID)!
  const setup = {
    name: defaultGameName(civA.name, map.name),
    map: deepClone(map),
    civilizations: [
      {
        template: deepClone(civA),
        playerType: 'human' as const,
        color: '#ff0000',
        capitalCityId: map.cities[0].id,
      },
      {
        template: deepClone(civB),
        playerType: 'ai' as const,
        color: '#00ff00',
        capitalCityId: map.cities[1].id,
      },
    ],
    rulesPreset: deepClone(preset),
    startingYear: DEFAULT_STARTING_YEAR,
    yearsPerTurn: DEFAULT_YEARS_PER_TURN,
    maximumTurns: 100,
  }

  const created = createGameSessionFromSetup(setup)
  assert(created.ok, `creates valid GameSession: ${created.ok ? '' : created.errors.join('; ')}`)
  if (!created.ok) throw new Error('unreachable')
  const session = created.session
  assert(session.id.startsWith('game-'), 'new ID')
  assert(session.createdAt && session.updatedAt, 'timestamps')
  assert(session.turn === 1, 'turn starts at 1')
  assert(session.currentYear === DEFAULT_STARTING_YEAR, 'current year = starting year')
  assert(session.tiles !== map.tiles, 'tiles deep copied (ref)')
  session.tiles['0,0'].terrain = 'desert'
  assert(map.tiles['0,0'].terrain === 'grassland', 'map mutation after creation does not affect… wait reverse')
  // restore session tile for later checks - actually we mutated session; map should be unchanged:
  assert(map.tiles['0,0'].terrain === 'grassland', 'session tile mutation does not affect map')

  assert(session.cities.length === map.cities.length, 'map cities converted to GameCities')
  const capitalA = session.cities.find((c) => c.id === map.cities[0].id)!
  const capitalB = session.cities.find((c) => c.id === map.cities[1].id)!
  const unclaimed = session.cities.find((c) => c.id === map.cities[2].id)!
  assert(capitalA.isCapital && capitalA.civId != null, 'assigned capitals owned and marked capital')
  assert(capitalB.isCapital && capitalB.civId != null, 'second capital owned')
  assert(unclaimed.civId === null && unclaimed.isCapital === false, 'non-capital cities remain unclaimed')

  const humanInst = session.civilizations.find((c) => c.playerType === 'human')!
  assert(humanInst.name === civA.name, 'civilization instances snapshot template data')
  assert(humanInst.color === '#ff0000', 'per-game color applied')
  assert(civA.defaultColor === '#aa0000', 'per-game color does not mutate template')
  assert(humanInst.templateId === civA.id, 'template id retained')

  assert(session.rules.settings.baseGrowthRate === preset.settings.baseGrowthRate, 'rules snapshot copied')
  session.rules.settings.baseGrowthRate = 0.99
  assert(preset.settings.baseGrowthRate === STANDARD_RULES_VALUES.baseGrowthRate, 'rules snapshot independent')

  map.name = 'Mutated Map Name'
  civA.name = 'Mutated Civ'
  preset.settings.cultureAnnexThreshold = 999
  assert(session.sourceMap?.templateName === 'Verify Map', 'map mutation after creation does not affect session')
  assert(humanInst.name === 'Rome', 'template mutation after creation does not affect session')
  assert(
    session.rules.settings.cultureAnnexThreshold === STANDARD_RULES_VALUES.cultureAnnexThreshold,
    'preset mutation after creation does not affect session',
  )

  // Restore sources for persistence tests
  map.name = 'Verify Map'
  civA.name = 'Rome'
  preset.settings.cultureAnnexThreshold = STANDARD_RULES_VALUES.cultureAnnexThreshold
  await services.maps.save(map)
  await services.civilizations.save(civA)
  await services.rulesPresets.save(preset)

  const badSetup = validateNewGameSetup({
    ...setup,
    name: '',
  })
  assert(badSetup.length > 0, 'failed validation does not… (name)')
  assert(
    createGameSessionFromSetup({ ...setup, name: '' }).ok === false,
    'failed validation does not create session',
  )

  section('persistence')
  resetNewGameCreateGuard()
  const saved = await createAndSaveGameSession({
    name: 'Persisted Game',
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
    maximumTurns: 50,
    options: { databaseName: DB },
  })
  assert(saved.ok, `save/load: ${saved.ok ? '' : saved.errors.join('; ')}`)
  if (!saved.ok) throw new Error('unreachable')

  const reloaded = await getGameSession(saved.session.id, { databaseName: DB })
  assert(reloaded?.id === saved.session.id, 'save/load through GameSessionRepository')

  resetCatalogPersistenceSingleton()
  const reopened = await createPersistence({ databaseName: DB, seed: true })
  const afterReopen = await reopened.gameSessions.get(saved.session.id)
  assert(afterReopen?.name === 'Persisted Game', 'survives repository reopen')

  const invalidSave = await createAndSaveGameSession({
    name: '',
    mapId: map.id,
    civilizations: [
      {
        templateId: civA.id,
        playerType: 'human',
        color: '#ff0000',
        capitalCityId: map.cities[0].id,
      },
    ],
    rulesPresetId: STANDARD_RULES_PRESET_ID,
    startingYear: -4000,
    yearsPerTurn: 10,
    maximumTurns: null,
    options: { databaseName: DB },
  })
  assert(!invalidSave.ok, 'failed validation does not save')

  await reopened.maps.delete(map.id)
  await reopened.rulesPresets.delete(STANDARD_RULES_PRESET_ID).catch(() => undefined)
  // Standard delete may be blocked at service layer; delete via repository directly
  await reopened.rulesPresets.delete(STANDARD_RULES_PRESET_ID)
  const stillThere = await reopened.gameSessions.get(saved.session.id)
  assert(stillThere?.id === saved.session.id, 'deletion of source map after creation does not delete session')
  assert(
    stillThere?.rules.settings.cultureAnnexThreshold === STANDARD_RULES_VALUES.cultureAnnexThreshold,
    'deletion of preset after creation does not invalidate session',
  )

  // Re-seed map/civ/preset for double-submit
  await reopened.maps.save(map)
  await reopened.civilizations.save(civA)
  await reopened.civilizations.save(civB)
  await reopened.rulesPresets.save(samplePreset(STANDARD_RULES_PRESET_ID, 'Standard'))
  resetCatalogPersistenceSingleton()
  resetNewGameCreateGuard()

  const payload = {
    name: 'Double Submit',
    mapId: map.id,
    civilizations: [
      {
        templateId: civA.id,
        playerType: 'human' as const,
        color: '#ff0000',
        capitalCityId: map.cities[0].id,
      },
    ],
    rulesPresetId: STANDARD_RULES_PRESET_ID,
    startingYear: -4000,
    yearsPerTurn: 10,
    maximumTurns: null as number | null,
    options: { databaseName: DB },
  }
  const [r1, r2] = await Promise.all([
    createAndSaveGameSession(payload),
    createAndSaveGameSession(payload),
  ])
  const oks = [r1, r2].filter((r) => r.ok)
  const busy = [r1, r2].filter((r) => !r.ok && r.code === 'busy')
  assert(oks.length === 1 && busy.length === 1, 'double-submit guard creates one session')

  section('wizard state')
  let wiz = createInitialWizardState(STANDARD_RULES_PRESET_ID)
  assert(
    !isWizardDirty(wiz, {
      startingYear: DEFAULT_STARTING_YEAR,
      yearsPerTurn: DEFAULT_YEARS_PER_TURN,
      maximumTurns: DEFAULT_MAXIMUM_TURNS,
      rulesPresetId: STANDARD_RULES_PRESET_ID,
    }),
    'untouched wizard not dirty',
  )
  wiz = selectMap(wiz, map.id, map.name, civA.name)
  wiz = addCivilization(
    wiz,
    { templateId: civA.id, playerType: 'human', color: civA.defaultColor },
    { humanName: civA.name, mapName: map.name },
  )
  wiz = setCivilizationCapital(wiz, civA.id, map.cities[0].id)
  assert(wiz.civilizations[0].capitalCityId === map.cities[0].id, 'capital set')
  wiz = selectMap(wiz, zeroCityMap.id, zeroCityMap.name, civA.name)
  assert(wiz.civilizations[0].capitalCityId === null, 'changing map clears capitals')
  wiz = setCivilizationCapital(wiz, civA.id, map.cities[0].id)
  wiz = removeCivilization(wiz, civA.id, {})
  assert(wiz.civilizations.length === 0, 'removing civ clears assignment')

  wiz = createInitialWizardState(STANDARD_RULES_PRESET_ID)
  wiz = selectMap(wiz, map.id, map.name)
  assert(
    isWizardDirty(wiz, {
      startingYear: DEFAULT_STARTING_YEAR,
      yearsPerTurn: DEFAULT_YEARS_PER_TURN,
      maximumTurns: DEFAULT_MAXIMUM_TURNS,
      rulesPresetId: STANDARD_RULES_PRESET_ID,
    }),
    'dirty wizard leave policy (dirty after map select)',
  )
  wiz = markCreationSucceeded(wiz)
  assert(
    !isWizardDirty(wiz, {
      startingYear: DEFAULT_STARTING_YEAR,
      yearsPerTurn: DEFAULT_YEARS_PER_TURN,
      maximumTurns: DEFAULT_MAXIMUM_TURNS,
      rulesPresetId: STANDARD_RULES_PRESET_ID,
    }),
    'successful creation clears leave warning',
  )

  // player type enforcement
  wiz = createInitialWizardState(STANDARD_RULES_PRESET_ID)
  wiz = addCivilization(
    wiz,
    { templateId: civA.id, playerType: 'human', color: '#1' },
    {},
  )
  wiz = addCivilization(
    wiz,
    { templateId: civB.id, playerType: 'ai', color: '#2' },
    {},
  )
  wiz = setCivilizationPlayerType(wiz, civB.id, 'human', {})
  assert(
    wiz.civilizations.filter((c) => c.playerType === 'human').length === 1 &&
      wiz.civilizations.find((c) => c.templateId === civB.id)?.playerType === 'human' &&
      wiz.civilizations.find((c) => c.templateId === civA.id)?.playerType === 'ai',
    'setting Human demotes previous Human',
  )

  section('minimal active placeholder data')
  resetCatalogPersistenceSingleton()
  const summary = await getGameSession(saved.session.id, { databaseName: DB })
  assert(summary?.name === 'Persisted Game', 'saved game summary loads by ID')
  const missing = await getGameSession('missing-game-id', { databaseName: DB })
  assert(missing === null, 'missing game ID returns not-found')

  // Source entities unchanged by createGameSessionFromSetup
  const mapAgain = await (await createPersistence({ databaseName: DB, seed: false })).maps.get(map.id)
  assert(mapAgain?.name === 'Verify Map', 'source map remains unchanged in repo')

  await deleteDatabase(DB).catch(() => undefined)
  resetCatalogPersistenceSingleton()
  resetNewGameCreateGuard()

  console.log('\nverify:new-game OK')
}

main().catch((err) => {
  console.error(err)
  throw err
})
