/**
 * F12 Debug Editing verification — fake IndexedDB, isolated DB.
 * Run: npm run verify:debug-editing
 */
import 'fake-indexeddb/auto'
import { getCatalogPersistence, resetCatalogPersistenceSingleton } from '../catalog/persistence'
import { createBlankOceanTiles, isoNow, newEntityId } from '../catalog/mapFactory'
import { deepClone } from '../domain/adapters'
import type { CivilizationTemplate } from '../domain/civilizations'
import type { GameSession } from '../domain/gameSession'
import type { MapTemplate } from '../domain/maps'
import { createPersistence, deleteDatabase } from '../persistence'
import { STANDARD_RULES_PRESET_ID } from '../persistence/seed'
import { createAndSaveGameSession, resetNewGameCreateGuard } from '../newGame/newGameService'
import { useGameStore } from '../game/store'
import { neighbors, tileKey } from '../game/hexGrid'
import {
  applyDebugEdit,
  DEFAULT_DEBUG_TOOL_SETTINGS,
  hydrateRuntimeFromSession,
  isDebugEditingAvailable,
  loadGameSession,
  resetActiveGameTurnGuard,
  setDebugEditingAvailableForTests,
  useActiveGameStore,
} from './index'

const DB = 'civ-browser-verify-debug-editing'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function section(title: string) {
  console.log(`\n== ${title} ==`)
}

function stableJson(value: unknown): string {
  return JSON.stringify(value)
}

function sampleMap(): MapTemplate {
  const id = newEntityId('map')
  const now = isoNow()
  const tiles = createBlankOceanTiles(12, 12)
  tiles['0,0'].terrain = 'grassland'
  tiles['1,0'].terrain = 'plains'
  tiles['2,0'].terrain = 'grassland'
  tiles['3,0'].terrain = 'lake'
  tiles['0,1'].terrain = 'grassland'
  const cities = [
    { id: `${id}-c1`, name: 'Alpha', coord: { q: 0, r: 0 }, startingPopulation: 2 },
    { id: `${id}-c2`, name: 'Beta', coord: { q: 1, r: 0 }, startingPopulation: 2 },
  ]
  for (const city of cities) {
    tiles[`${city.coord.q},${city.coord.r}`].cityId = city.id
  }
  return {
    id,
    name: 'Debug Verify Map',
    description: '',
    version: 1,
    width: 12,
    height: 12,
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

async function seedPlayableSession(): Promise<{
  session: GameSession
  mapId: string
  civAId: string
}> {
  const services = await createPersistence({ databaseName: DB, seed: true })
  const map = sampleMap()
  const civA = sampleCiv('civ-a', 'Rome', '#aa0000')
  const civB = sampleCiv('civ-b', 'Greece', '#0066aa')
  await services.maps.save(map)
  await services.civilizations.save(civA)
  await services.civilizations.save(civB)

  resetNewGameCreateGuard()
  const saved = await createAndSaveGameSession({
    name: 'Debug Verify Game',
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
    maximumTurns: 20,
    options: { databaseName: DB },
  })
  assert(saved.ok, `seed session: ${saved.ok ? '' : saved.errors.join('; ')}`)
  if (!saved.ok) throw new Error('unreachable')
  return { session: saved.session, mapId: map.id, civAId: civA.id }
}

async function seedOtherSession(mapId: string, civAId: string, civBId: string): Promise<GameSession> {
  resetNewGameCreateGuard()
  const services = await createPersistence({ databaseName: DB, seed: false })
  const map = await services.maps.get(mapId)
  assert(map, 'map for other session')
  const saved = await createAndSaveGameSession({
    name: 'Other Debug Session',
    mapId,
    civilizations: [
      {
        templateId: civAId,
        playerType: 'human',
        color: '#112233',
        capitalCityId: map!.cities[0].id,
      },
      {
        templateId: civBId,
        playerType: 'ai',
        color: '#445566',
        capitalCityId: map!.cities[1].id,
      },
    ],
    rulesPresetId: STANDARD_RULES_PRESET_ID,
    startingYear: -3000,
    yearsPerTurn: 25,
    maximumTurns: null,
    options: { databaseName: DB },
  })
  assert(saved.ok, `other session: ${saved.ok ? '' : saved.errors.join('; ')}`)
  if (!saved.ok) throw new Error('unreachable')
  return saved.session
}

function hydrateStore(session: GameSession) {
  useActiveGameStore.getState().reset()
  useActiveGameStore.setState({
    ...useActiveGameStore.getState(),
    ...hydrateRuntimeFromSession(session),
  })
}

async function main() {
  await deleteDatabase(DB).catch(() => undefined)
  resetCatalogPersistenceSingleton()
  resetActiveGameTurnGuard()
  resetNewGameCreateGuard()
  setDebugEditingAvailableForTests(false)

  section('availability / state')
  assert(!isDebugEditingAvailable(), 'default gate false without force')
  setDebugEditingAvailableForTests(true)
  assert(isDebugEditingAvailable(), 'force flag enables availability')

  const { session, mapId, civAId } = await seedPlayableSession()
  const other = await seedOtherSession(mapId, civAId, 'civ-b')

  const services = await createPersistence({ databaseName: DB, seed: false })
  const mapSnap = deepClone(await services.maps.get(mapId))
  const civSnap = deepClone(await services.civilizations.get(civAId))
  const rulesSnap = deepClone(await services.rulesPresets.get(STANDARD_RULES_PRESET_ID))
  const otherSnap = deepClone(await services.gameSessions.get(other.id))
  assert(mapSnap && civSnap && rulesSnap && otherSnap, 'source snapshots')

  const editorTilesBefore = deepClone(useGameStore.getState().game.tiles)

  // Bind catalog singleton to verify DB so store.save/load hit the same store
  resetCatalogPersistenceSingleton()
  await getCatalogPersistence({ databaseName: DB, seed: false })

  hydrateStore(session)
  let st = useActiveGameStore.getState()
  assert(st.loadStatus === 'ready', 'session ready')
  assert(st.debug.enabled === false, 'debug disabled on hydrate')
  assert(st.debug.interactionMode === 'inspect', 'inspect by default')

  const enabled = useActiveGameStore.getState().enableDebugEditing()
  assert(enabled.ok, 'enableDebugEditing succeeds when available')
  assert(useActiveGameStore.getState().debug.enabled, 'debug enabled')

  useActiveGameStore.getState().disableDebugEditing()
  assert(!useActiveGameStore.getState().debug.enabled, 'disable works')
  assert(useActiveGameStore.getState().debug.interactionMode === 'inspect', 'disable restores inspect')

  // Rehydrate leaves debug disabled
  useActiveGameStore.getState().enableDebugEditing()
  hydrateStore(session)
  assert(!useActiveGameStore.getState().debug.enabled, 'rehydrate disables debug')

  section('interaction / tools')
  setDebugEditingAvailableForTests(true)
  hydrateStore(session)
  useActiveGameStore.getState().enableDebugEditing()

  useActiveGameStore.getState().selectTile('2,0')
  assert(useActiveGameStore.getState().selectedTileKey === '2,0', 'inspect select works')
  assert(!useActiveGameStore.getState().dirty, 'select does not dirty')

  const editWhileInspect = useActiveGameStore.getState().applyDebugEditAt('2,0')
  assert(!editWhileInspect.ok, 'edit blocked in inspect mode')

  useActiveGameStore.getState().setDebugInteractionMode('edit')
  useActiveGameStore.getState().setDebugTool('terrain')
  useActiveGameStore.getState().setDebugTerrain('desert')
  let painted = useActiveGameStore.getState().applyDebugEditAt('2,0')
  assert(painted.ok, `terrain edit ok: ${painted.error ?? ''}`)
  st = useActiveGameStore.getState()
  assert(st.tiles['2,0'].terrain === 'desert', 'terrain changed')
  assert(st.dirty, 'edit marks dirty')
  assert(st.selectedTileKey === null, 'edit click clears selection')

  useActiveGameStore.getState().setDebugTool('features')
  useActiveGameStore.getState().setDebugFeature('forest')
  painted = useActiveGameStore.getState().applyDebugEditAt('2,0')
  assert(painted.ok, 'feature edit ok')
  assert(useActiveGameStore.getState().tiles['2,0'].vegetation === 'forest', 'feature set')

  useActiveGameStore.getState().setDebugTool('hills')
  useActiveGameStore.getState().setDebugElevationAction('add')
  painted = useActiveGameStore.getState().applyDebugEditAt('2,0')
  assert(painted.ok, 'hills add ok')
  assert(useActiveGameStore.getState().tiles['2,0'].hasHills, 'hills on')

  useActiveGameStore.getState().setDebugTool('mountains')
  useActiveGameStore.getState().setDebugElevationAction('add')
  painted = useActiveGameStore.getState().applyDebugEditAt('2,0')
  assert(painted.ok, 'mountains add ok')
  st = useActiveGameStore.getState()
  assert(st.tiles['2,0'].terrain === 'mountains', 'mountains terrain')
  assert(!st.tiles['2,0'].hasHills, 'hills cleared on mountains')

  useActiveGameStore.getState().setDebugElevationAction('remove')
  painted = useActiveGameStore.getState().applyDebugEditAt('2,0')
  assert(painted.ok, 'mountains remove ok')
  assert(useActiveGameStore.getState().tiles['2,0'].terrain === 'plains', 'mountains removed to plains')

  useActiveGameStore.getState().setDebugTool('rivers')
  painted = useActiveGameStore.getState().applyDebugEditAt('2,0', 0)
  assert(painted.ok, `river add ok: ${painted.error ?? ''}`)
  st = useActiveGameStore.getState()
  assert(st.tiles['2,0'].riverDirections.length > 0, 'river on tile')
  const dir = (6 - 0) % 6
  const nCoord = neighbors(st.tiles['2,0'].coord)[dir]
  const nKey = tileKey(nCoord)
  if (st.tiles[nKey]) {
    assert(st.tiles[nKey].riverDirections.includes((dir + 3) % 6), 'river mirrored')
  }

  useActiveGameStore.getState().setDebugTool('terrain')
  useActiveGameStore.getState().setDebugTerrain('plains')
  useActiveGameStore.getState().applyDebugEditAt('2,0')
  useActiveGameStore.getState().setDebugTool('features')
  useActiveGameStore.getState().setDebugFeature('none')
  useActiveGameStore.getState().applyDebugEditAt('2,0')
  useActiveGameStore.getState().setDebugTool('resources')
  useActiveGameStore.getState().setDebugResource('wheat')
  painted = useActiveGameStore.getState().applyDebugEditAt('2,0')
  assert(painted.ok, `resource ok: ${painted.error ?? ''}`)
  assert(useActiveGameStore.getState().tiles['2,0'].resource === 'wheat', 'resource set')

  const cityKey = '0,0'
  const cityTerrain = useActiveGameStore.getState().tiles[cityKey].terrain
  const cityId = useActiveGameStore.getState().tiles[cityKey].cityId
  useActiveGameStore.getState().setDebugTool('features')
  useActiveGameStore.getState().setDebugFeature('forest')
  useActiveGameStore.getState().applyDebugEditAt(cityKey)
  useActiveGameStore.getState().setDebugTool('clear')
  painted = useActiveGameStore.getState().applyDebugEditAt(cityKey)
  assert(painted.ok, 'clear ok')
  st = useActiveGameStore.getState()
  assert(st.tiles[cityKey].terrain === cityTerrain, 'clear preserves terrain')
  assert(st.tiles[cityKey].cityId === cityId, 'clear preserves city')
  assert(st.tiles[cityKey].vegetation === 'none', 'clear removes feature')
  assert(st.cities.some((c) => c.id === cityId), 'city entity remains')

  useActiveGameStore.getState().setDebugTool('terrain')
  useActiveGameStore.getState().setDebugTerrain('ocean')
  painted = useActiveGameStore.getState().applyDebugEditAt(cityKey)
  assert(!painted.ok, 'block water under city')
  assert(useActiveGameStore.getState().tiles[cityKey].terrain === cityTerrain, 'city terrain unchanged')

  const missing = applyDebugEdit(
    {},
    { tool: 'terrain', tileKey: '9,9', settings: DEFAULT_DEBUG_TOOL_SETTINGS },
  )
  assert(!missing.ok && missing.error === 'missing-tile', 'missing tile safe')

  section('persistence')
  assert(useActiveGameStore.getState().dirty, 'still dirty after edits')
  const saved = await useActiveGameStore.getState().save()
  assert(saved, 'save succeeds')
  st = useActiveGameStore.getState()
  assert(!st.dirty, 'clean after save')
  assert(st.debug.pendingChangedTileCount === 0, 'pending cleared')
  assert(
    st.events.some((e) => e.type === 'debug_edit_saved'),
    'debug_edit_saved event appended',
  )

  const reloaded = await loadGameSession(session.id, { databaseName: DB })
  assert(reloaded.ok, 'session reloaded')
  if (!reloaded.ok) throw new Error('unreachable')
  assert(reloaded.session.tiles['2,0'].resource === 'wheat', 'saved edit persists')

  hydrateStore(reloaded.session)
  useActiveGameStore.getState().enableDebugEditing()
  useActiveGameStore.getState().setDebugInteractionMode('edit')
  useActiveGameStore.getState().setDebugTool('terrain')
  useActiveGameStore.getState().setDebugTerrain('tundra')
  useActiveGameStore.getState().applyDebugEditAt('2,0')
  assert(useActiveGameStore.getState().tiles['2,0'].terrain === 'tundra', 'tundra set')
  useActiveGameStore.getState().disableDebugEditing()
  assert(useActiveGameStore.getState().tiles['2,0'].terrain === 'tundra', 'disable keeps edits')
  assert(useActiveGameStore.getState().dirty, 'still dirty after disable')

  section('isolation')
  const mapAfter = await services.maps.get(mapId)
  const civAfter = await services.civilizations.get(civAId)
  const rulesAfter = await services.rulesPresets.get(STANDARD_RULES_PRESET_ID)
  const otherAfter = await services.gameSessions.get(other.id)
  assert(stableJson(mapAfter) === stableJson(mapSnap), 'MapTemplate unchanged')
  assert(stableJson(civAfter) === stableJson(civSnap), 'CivilizationTemplate unchanged')
  assert(stableJson(rulesAfter) === stableJson(rulesSnap), 'GameRulesPreset unchanged')
  assert(stableJson(otherAfter) === stableJson(otherSnap), 'other GameSession unchanged')

  const editorTilesAfter = useGameStore.getState().game.tiles
  assert(stableJson(editorTilesAfter) === stableJson(editorTilesBefore), 'World Editor store unchanged')

  useActiveGameStore.getState().tiles['2,0'].terrain = 'snow'
  const mapAgain = await services.maps.get(mapId)
  assert(mapAgain!.tiles['2,0'].terrain === mapSnap!.tiles['2,0'].terrain, 'no shared map refs')

  section('compatibility')
  await useActiveGameStore.getState().save()
  const afterSave = await loadGameSession(session.id, { databaseName: DB })
  assert(afterSave.ok, 'reload after save')
  if (!afterSave.ok) throw new Error('unreachable')
  hydrateStore(afterSave.session)
  assert(!useActiveGameStore.getState().debug.enabled, 'rehydrate disables debug')
  useActiveGameStore.getState().selectTile('1,0')
  assert(useActiveGameStore.getState().selectedTileKey === '1,0', 'inspect select after reload')

  const turnBefore = useActiveGameStore.getState().turn
  await useActiveGameStore.getState().endTurn()
  assert(useActiveGameStore.getState().turn === turnBefore + 1, 'next turn advances once')

  setDebugEditingAvailableForTests(false)
  const denied = useActiveGameStore.getState().enableDebugEditing()
  assert(!denied.ok, 'gate blocks enable when unavailable')

  const bare: GameSession = {
    ...deepClone(session),
    id: newEntityId('gs'),
    name: 'Bare',
    events: undefined,
    updatedAt: isoNow(),
  }
  await services.gameSessions.save(bare)
  const bareLoaded = await loadGameSession(bare.id, { databaseName: DB })
  assert(bareLoaded.ok, 'old session loads')
  if (!bareLoaded.ok) throw new Error('unreachable')
  hydrateStore(bareLoaded.session)
  assert(useActiveGameStore.getState().events.length === 0, 'missing events normalize empty')
  assert(!useActiveGameStore.getState().debug.enabled, 'debug off')

  console.log('\nverify:debug-editing OK')
  await deleteDatabase(DB).catch(() => undefined)
  resetCatalogPersistenceSingleton()
  setDebugEditingAvailableForTests(false)
  useActiveGameStore.getState().reset()
}

main().catch((err) => {
  console.error(err)
  // eslint-disable-next-line no-process-exit
  ;(globalThis as { process?: { exit: (c: number) => void } }).process?.exit(1)
})
