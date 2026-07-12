/**
 * F6 World Editor UI verification — store/UI state contracts without touching IndexedDB.
 *
 * Run: npm run verify:world-editor-ui
 */
import { applyDisplayPreset, DEFAULT_DISPLAY_LAYERS, toggleDisplayLayer } from './displayLayers'
import { useGameStore } from '../game/store'
import { tileKey } from '../game/hexGrid'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function section(title: string) {
  console.log(`\n== ${title} ==`)
}

function resetEditorUiState() {
  useGameStore.setState({
    editorDirty: false,
    editorDisplay: { ...DEFAULT_DISPLAY_LAYERS },
    viewMode: 'edit',
    selectedEditorCityId: null,
    cameraFocusRequest: null,
    builder: {
      selectedTerrain: 'grassland',
      selectedResource: 'none',
      mode: 'terrain',
      selectedVegetation: 'none',
      brushRadius: 0,
    },
  })
}

async function main() {
  section('display presets / layers (no dirty)')
  resetEditorUiState()
  const beforeDirty = useGameStore.getState().editorDirty
  useGameStore.getState().applyEditorDisplayPreset('terrainOnly')
  assert(useGameStore.getState().editorDirty === beforeDirty, 'display preset must not change dirty')
  assert(
    JSON.stringify(useGameStore.getState().editorDisplay) === JSON.stringify(applyDisplayPreset('terrainOnly')),
    'terrainOnly preset mismatch',
  )
  useGameStore.getState().toggleEditorDisplayLayer('resources')
  assert(useGameStore.getState().editorDisplay.resources === true, 'resources layer should toggle on')
  assert(useGameStore.getState().editorDirty === false, 'toggle display must not dirty')
  const toggled = toggleDisplayLayer(DEFAULT_DISPLAY_LAYERS, 'grid')
  assert(toggled.grid === false, 'toggleDisplayLayer helper')

  section('view / edit mode')
  useGameStore.getState().setViewMode('view')
  assert(useGameStore.getState().viewMode === 'view', 'view mode')
  useGameStore.getState().setViewMode('edit')
  assert(useGameStore.getState().viewMode === 'edit', 'edit mode')

  section('tool wiring')
  useGameStore.getState().setSelectedTerrain('desert')
  assert(useGameStore.getState().builder.mode === 'terrain', 'terrain mode')
  assert(useGameStore.getState().builder.selectedTerrain === 'desert', 'desert selected')
  useGameStore.getState().setSelectedVegetation('forest')
  assert(useGameStore.getState().builder.mode === 'vegetation', 'vegetation mode')
  useGameStore.getState().setMode('hills')
  assert(useGameStore.getState().builder.mode === 'hills', 'hills mode')
  useGameStore.getState().setMode('river')
  assert(useGameStore.getState().builder.mode === 'river', 'river mode')
  useGameStore.getState().setSelectedResource('iron')
  assert(useGameStore.getState().builder.mode === 'resource', 'resource mode')
  useGameStore.getState().setMode('city')
  assert(useGameStore.getState().builder.mode === 'city', 'city mode')
  useGameStore.getState().setMode('clear')
  assert(useGameStore.getState().builder.mode === 'clear', 'clear mode')

  section('clear tile preserves city + terrain')
  resetEditorUiState()
  const tiles = useGameStore.getState().game.tiles
  const sampleKey = Object.keys(tiles).find((k) => {
    const t = tiles[k]
    return t && t.terrain !== 'ocean' && t.terrain !== 'coast'
  })
  assert(sampleKey, 'expected a land tile')
  const sample = tiles[sampleKey!]
  useGameStore.setState({
    game: {
      ...useGameStore.getState().game,
      tiles: {
        ...tiles,
        [sampleKey!]: {
          ...sample,
          vegetation: 'forest',
          hasHills: true,
          resource: 'wheat',
          ownerCivId: 'player',
          riverDirections: [0],
          cityId: 'city-keep',
        },
      },
      cities: [
        {
          id: 'city-keep',
          civId: null,
          name: 'Keep',
          coord: sample.coord,
          population: 3,
          productionQueue: [],
          culture: 0,
          isCapital: false,
          growthRateBonus: 0,
        },
      ],
    },
    editorDirty: false,
    builder: { ...useGameStore.getState().builder, mode: 'clear', brushRadius: 0 },
  })
  useGameStore.getState().paintAt(sampleKey!)
  const cleared = useGameStore.getState().game.tiles[sampleKey!]
  assert(cleared.terrain === sample.terrain, 'terrain preserved')
  assert(cleared.cityId === 'city-keep', 'city preserved')
  assert(cleared.vegetation === 'none', 'vegetation cleared')
  assert(cleared.hasHills === false, 'hills cleared')
  assert(cleared.resource === 'none', 'resource cleared')
  assert(cleared.ownerCivId === null, 'owner cleared')
  assert(cleared.riverDirections.length === 0, 'rivers cleared')
  assert(useGameStore.getState().game.cities.some((c) => c.id === 'city-keep'), 'city still exists')
  assert(useGameStore.getState().editorDirty === true, 'clear marks dirty')

  section('city delete is separate from clear')
  const cityTileKey = tileKey(sample.coord)
  useGameStore.getState().removeCity(cityTileKey)
  assert(useGameStore.getState().game.tiles[cityTileKey].cityId === null, 'city removed from tile')
  assert(useGameStore.getState().game.cities.length === 0, 'city list empty')

  section('metadata marks dirty; display does not')
  resetEditorUiState()
  useGameStore.getState().setCatalogMapMeta({ name: 'Test Map', description: 'desc' })
  assert(useGameStore.getState().editorDirty === true, 'meta dirty')
  assert(useGameStore.getState().activeCatalogMapName === 'Test Map', 'meta name')
  useGameStore.setState({ editorDirty: false })
  useGameStore.getState().applyEditorDisplayPreset('citiesOnly')
  assert(useGameStore.getState().editorDirty === false, 'citiesOnly does not dirty')

  section('json import marks dirty')
  const exported = useGameStore.getState().exportMap()
  useGameStore.setState({ editorDirty: false })
  const imported = useGameStore.getState().importMap(exported)
  assert(imported.success === true, 'import ok')
  assert(useGameStore.getState().editorDirty === true, 'import dirty')

  section('camera focus does not dirty')
  useGameStore.setState({ editorDirty: false })
  useGameStore.getState().requestCameraFocus({ q: 3, r: 4 })
  assert(useGameStore.getState().editorDirty === false, 'focus does not dirty')
  assert(useGameStore.getState().cameraFocusRequest?.coord.q === 3, 'focus coord')

  section('presets produce expected visibility')
  const relief = applyDisplayPreset('relief')
  assert(relief.resources === false, 'relief hides resources')
  assert(relief.mountainsHills === true, 'relief shows relief')
  assert(relief.rivers === true, 'relief shows rivers')
  const resourcesOnly = applyDisplayPreset('resourcesOnly')
  assert(resourcesOnly.resources === true, 'resourcesOnly shows resources')
  assert(resourcesOnly.cities === false, 'resourcesOnly hides cities')

  console.log('\nverify:world-editor-ui OK')
}

main().catch((err) => {
  console.error(err)
  throw err
})
