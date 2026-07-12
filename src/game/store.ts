import { create } from 'zustand'
import { GameState, Tile, TerrainType, ResourceType, VegetationType, City, Civilization, GameSettings, AxialCoord } from './types'
import { hexDistance, neighbors, tileKey } from './hexGrid'
import { generateProceduralMap, generateEarthLikeMap } from './mapGenerator'
import {
  applyDisplayPreset,
  DEFAULT_DISPLAY_LAYERS,
  EditorDisplayLayers,
  EditorDisplayPreset,
  toggleDisplayLayer,
} from '../editor/displayLayers'
import {
  addRandomLongRiver,
  addRandomMountainChain,
  addRandomShortRiver,
  addRandomSmallMountainArea,
  clearAllFeatures,
  clearAllMountainsAndHills,
  clearAllResources,
  clearAllRivers,
  generateFeatures,
  generateResources,
  generateTerrainOnly,
  LayerOpResult,
  ResourceDensity,
} from './mapLayers'

// Размер карты — меняется здесь. 220x160 (~35 000 гексов) — компромисс между
// "ощущением огромного мира" и тем, чтобы ИИ/перемещение юнитов не превратились
// в мучение на таком масштабе. Камера + отсечение невидимых тайлов в
// MapCanvas.tsx уже поддерживают рост до 400x400+, если решишь увеличить —
// проверяй производительность на своей машине при увеличении.
export const MAP_WIDTH = 250
export const MAP_HEIGHT = 135

function createInitialTiles(): Record<string, Tile> {
  return generateProceduralMap({ width: MAP_WIDTH, height: MAP_HEIGHT })
}

/** Clear vegetation/hills/rivers/resource/owner; keep terrain and city. */
function clearTileFields(tiles: Record<string, Tile>, key: string) {
  const tile = tiles[key]
  if (!tile) return
  for (const dir of tile.riverDirections) {
    const neighborCoord = neighbors(tile.coord)[dir]
    const neighborKey = tileKey(neighborCoord)
    const neighbor = tiles[neighborKey]
    if (neighbor) {
      const mirrorDir = (dir + 3) % 6
      tiles[neighborKey] = {
        ...neighbor,
        riverDirections: neighbor.riverDirections.filter((d) => d !== mirrorDir),
      }
    }
  }
  tiles[key] = {
    ...tile,
    vegetation: 'none',
    hasHills: false,
    riverDirections: [],
    resource: 'none',
    ownerCivId: null,
  }
}

interface BuilderState {
  selectedTerrain: TerrainType
  selectedResource: ResourceType
  mode: 'terrain' | 'resource' | 'city' | 'hills' | 'vegetation' | 'river' | 'clear'
  selectedVegetation: VegetationType
  brushRadius: number // 0 = один гекс, 1 = гекс + соседи, и т.д.
}

export type { EditorDisplayLayers, EditorDisplayPreset }

interface Store {
  game: GameState
  builder: BuilderState
  viewMode: 'edit' | 'view'
  viewingTileKey: string | null
  addingCityAtKey: string | null
  paintAt: (center: string) => void
  regenerateMap: (seed?: number) => void
  generateEarthMap: (seed?: number) => void
  /** F7: apply a layer operation result (dirty only if changed). */
  applyLayerResult: (result: LayerOpResult) => LayerOpResult
  generateTerrainLayer: (seed?: number) => LayerOpResult
  clearFeaturesLayer: () => LayerOpResult
  generateFeaturesLayer: (seed?: number) => LayerOpResult
  clearMountainsHillsLayer: () => LayerOpResult
  addSmallMountainArea: (seed?: number) => LayerOpResult
  addMountainChain: (seed?: number) => LayerOpResult
  clearRiversLayer: () => LayerOpResult
  addShortRiver: (seed?: number) => LayerOpResult
  addLongRiver: (seed?: number) => LayerOpResult
  clearResourcesLayer: () => LayerOpResult
  generateResourcesLayer: (density?: ResourceDensity, seed?: number) => LayerOpResult
  resourceDensity: ResourceDensity
  setResourceDensity: (d: ResourceDensity) => void
  lastLayerOpMessage: string | null
  clearLastLayerOpMessage: () => void
  setViewMode: (m: 'edit' | 'view') => void
  setViewingTile: (key: string | null) => void
  setAddingCityAt: (key: string | null) => void
  addCity: (tileKey: string, name: string, population: number) => void
  removeCity: (tileKey: string) => void
  updateCity: (
    cityId: string,
    updates: Partial<Pick<City, 'name' | 'population' | 'growthRateBonus'>>,
  ) => void
  clearTileExtras: (centerKey: string) => void
  setSelectedTerrain: (t: TerrainType) => void
  setSelectedResource: (r: ResourceType) => void
  setSelectedVegetation: (v: VegetationType) => void
  setMode: (m: BuilderState['mode']) => void
  setBrushRadius: (r: number) => void
  toggleRiverEdge: (tileKey: string, edgeIndex: number) => void
  editorDisplay: EditorDisplayLayers
  setEditorDisplayLayer: (key: keyof EditorDisplayLayers, value: boolean) => void
  toggleEditorDisplayLayer: (key: keyof EditorDisplayLayers) => void
  applyEditorDisplayPreset: (preset: EditorDisplayPreset) => void
  cameraFocusRequest: { coord: AxialCoord; nonce: number } | null
  requestCameraFocus: (coord: AxialCoord) => void
  clearCameraFocusRequest: () => void
  selectedEditorCityId: string | null
  setSelectedEditorCityId: (cityId: string | null) => void
  addCivilization: (name: string, color: string, cultureName: string, flagEmoji: string) => void
  removeCivilization: (civId: string) => void
  updateCivilization: (civId: string, updates: Partial<Civilization>) => void
  assigningCapitalForCivId: string | null
  setAssigningCapitalFor: (civId: string | null) => void
  assignCapital: (civId: string, cityId: string) => void
  setGameSettings: (updates: Partial<GameSettings>) => void
  setCityGrowthBonus: (cityId: string, bonus: number) => void
  gamePhase: 'setup' | 'playing'
  currentYear: number
  yearsPerTurn: number
  startGame: (startYear: number, yearsPerTurn: number) => void
  endTurn: () => void
  exportMap: () => string
  importMap: (json: string) => { success: boolean; error?: string }
  /** F5: load selected catalog map into legacy editor (clears dirty). */
  loadSelectedCatalogMap: (input: {
    tiles: Record<string, Tile>
    cities: City[]
    catalogMapId: string
    catalogMapName: string
    catalogMapDescription: string
    catalogMapVersion: number
    catalogMapCreatedAt: string
    width: number
    height: number
    lastSavedAt: string
  }) => void
  /** @deprecated F4 name — alias of loadSelectedCatalogMap with default meta. */
  loadCatalogMapBridge: (input: {
    tiles: Record<string, Tile>
    cities: City[]
    catalogMapId: string
    catalogMapName: string
  }) => void
  clearCatalogEditorBinding: () => void
  markEditorDirty: () => void
  clearEditorDirty: () => void
  setCatalogMapMeta: (updates: { name?: string; description?: string }) => void
  activeCatalogMapId: string | null
  activeCatalogMapName: string
  activeCatalogMapDescription: string
  activeCatalogMapVersion: number
  activeCatalogMapCreatedAt: string | null
  activeMapWidth: number
  activeMapHeight: number
  editorDirty: boolean
  lastSavedAt: string | null
  /** F4 compatibility mirror of active catalog id/name. */
  catalogBridge: { mapId: string; mapName: string } | null
}

export const useGameStore = create<Store>((set, get) => ({
  game: {
    tiles: createInitialTiles(),
    cities: [],
    units: [],
    civilizations: [
      {
        id: 'player',
        name: 'Игрок',
        color: '#3b82f6',
        playerType: 'human',
        cultureName: 'Игроки',
        flagEmoji: '👑',
        capitalCityId: null,
      },
      {
        id: 'ai-1',
        name: 'Соперник A',
        color: '#ef4444',
        playerType: 'ai',
        cultureName: 'Соперники',
        flagEmoji: '⚔️',
        capitalCityId: null,
      },
    ],
    turn: 1,
    settings: {
      baseGrowthRate: 0.01,
      capitalCulturePerTurn: 1,
      cultureAnnexThreshold: 50,
    },
  },
  builder: {
    selectedTerrain: 'grassland',
    selectedResource: 'none',
    mode: 'terrain',
    selectedVegetation: 'none',
    brushRadius: 0,
  },
  viewMode: 'edit',
  viewingTileKey: null,
  addingCityAtKey: null,
  assigningCapitalForCivId: null,
  gamePhase: 'setup',
  currentYear: 0,
  yearsPerTurn: 10,
  activeCatalogMapId: null,
  activeCatalogMapName: '',
  activeCatalogMapDescription: '',
  activeCatalogMapVersion: 1,
  activeCatalogMapCreatedAt: null,
  activeMapWidth: MAP_WIDTH,
  activeMapHeight: MAP_HEIGHT,
  editorDirty: false,
  lastSavedAt: null,
  catalogBridge: null,
  resourceDensity: 'standard',
  lastLayerOpMessage: null,
  setResourceDensity: (d) => set({ resourceDensity: d }),
  clearLastLayerOpMessage: () => set({ lastLayerOpMessage: null }),
  applyLayerResult: (result) => {
    if (!result.ok) {
      set({ lastLayerOpMessage: result.message })
      return result
    }
    if (result.changed && result.tiles) {
      const { game } = get()
      set({
        game: { ...game, tiles: result.tiles },
        editorDirty: true,
        lastLayerOpMessage: result.message,
      })
    } else {
      set({ lastLayerOpMessage: result.message })
    }
    return result
  },
  generateTerrainLayer: (seed) => {
    const s = get()
    return get().applyLayerResult(
      generateTerrainOnly(s.game.tiles, {
        width: s.activeMapWidth,
        height: s.activeMapHeight,
        seed,
      }),
    )
  },
  clearFeaturesLayer: () => get().applyLayerResult(clearAllFeatures(get().game.tiles)),
  generateFeaturesLayer: (seed) => {
    const s = get()
    return get().applyLayerResult(
      generateFeatures(s.game.tiles, {
        width: s.activeMapWidth,
        height: s.activeMapHeight,
        seed,
      }),
    )
  },
  clearMountainsHillsLayer: () =>
    get().applyLayerResult(clearAllMountainsAndHills(get().game.tiles)),
  addSmallMountainArea: (seed) => {
    const s = get()
    return get().applyLayerResult(
      addRandomSmallMountainArea(s.game.tiles, {
        width: s.activeMapWidth,
        height: s.activeMapHeight,
        seed,
      }),
    )
  },
  addMountainChain: (seed) => {
    const s = get()
    return get().applyLayerResult(
      addRandomMountainChain(s.game.tiles, {
        width: s.activeMapWidth,
        height: s.activeMapHeight,
        seed,
      }),
    )
  },
  clearRiversLayer: () => get().applyLayerResult(clearAllRivers(get().game.tiles)),
  addShortRiver: (seed) => {
    const s = get()
    return get().applyLayerResult(
      addRandomShortRiver(s.game.tiles, {
        width: s.activeMapWidth,
        height: s.activeMapHeight,
        seed,
      }),
    )
  },
  addLongRiver: (seed) => {
    const s = get()
    return get().applyLayerResult(
      addRandomLongRiver(s.game.tiles, {
        width: s.activeMapWidth,
        height: s.activeMapHeight,
        seed,
      }),
    )
  },
  clearResourcesLayer: () => get().applyLayerResult(clearAllResources(get().game.tiles)),
  generateResourcesLayer: (density, seed) => {
    const s = get()
    return get().applyLayerResult(
      generateResources(s.game.tiles, {
        width: s.activeMapWidth,
        height: s.activeMapHeight,
        seed,
        density: density ?? s.resourceDensity,
      }),
    )
  },
  editorDisplay: { ...DEFAULT_DISPLAY_LAYERS },
  cameraFocusRequest: null,
  selectedEditorCityId: null,
  setEditorDisplayLayer: (key, value) =>
    set((s) => ({ editorDisplay: { ...s.editorDisplay, [key]: value } })),
  toggleEditorDisplayLayer: (key) =>
    set((s) => ({ editorDisplay: toggleDisplayLayer(s.editorDisplay, key) })),
  applyEditorDisplayPreset: (preset) =>
    set({ editorDisplay: applyDisplayPreset(preset) }),
  requestCameraFocus: (coord) =>
    set((s) => ({
      cameraFocusRequest: { coord, nonce: (s.cameraFocusRequest?.nonce ?? 0) + 1 },
    })),
  clearCameraFocusRequest: () => set({ cameraFocusRequest: null }),
  setSelectedEditorCityId: (cityId) => set({ selectedEditorCityId: cityId }),
  markEditorDirty: () => set({ editorDirty: true }),
  clearEditorDirty: () => set({ editorDirty: false }),
  setCatalogMapMeta: (updates) => {
    set((s) => ({
      activeCatalogMapName: updates.name ?? s.activeCatalogMapName,
      activeCatalogMapDescription: updates.description ?? s.activeCatalogMapDescription,
      catalogBridge: s.activeCatalogMapId
        ? { mapId: s.activeCatalogMapId, mapName: updates.name ?? s.activeCatalogMapName }
        : s.catalogBridge,
      editorDirty: true,
    }))
  },
  clearCatalogEditorBinding: () =>
    set({
      activeCatalogMapId: null,
      activeCatalogMapName: '',
      activeCatalogMapDescription: '',
      activeCatalogMapVersion: 1,
      activeCatalogMapCreatedAt: null,
      editorDirty: false,
      lastSavedAt: null,
      catalogBridge: null,
    }),
  paintAt: (centerKey) => {
    const { game, builder } = get()
    const centerTile = game.tiles[centerKey]
    if (!centerTile) return

    const affected =
      builder.brushRadius === 0
        ? [centerTile]
        : Object.values(game.tiles).filter(
            (t) => hexDistance(t.coord, centerTile.coord) <= builder.brushRadius,
          )

    const updatedTiles = { ...game.tiles }

    if (builder.mode === 'hills') {
      const newValue = !centerTile.hasHills
      for (const tile of affected) {
        const key = tileKey(tile.coord)
        updatedTiles[key] = { ...tile, hasHills: newValue }
      }
      set({ game: { ...game, tiles: updatedTiles }, editorDirty: true })
      return
    }

    if (builder.mode === 'clear') {
      for (const tile of affected) {
        clearTileFields(updatedTiles, tileKey(tile.coord))
      }
      set({ game: { ...game, tiles: updatedTiles }, editorDirty: true })
      return
    }

    for (const tile of affected) {
      const key = tileKey(tile.coord)
      const updated: Tile = { ...tile }
      if (builder.mode === 'terrain') {
        updated.terrain = builder.selectedTerrain
      } else if (builder.mode === 'resource') {
        updated.resource = builder.selectedResource
      } else if (builder.mode === 'vegetation') {
        updated.vegetation = builder.selectedVegetation
      }
      updatedTiles[key] = updated
    }

    set({ game: { ...game, tiles: updatedTiles }, editorDirty: true })
  },
  regenerateMap: (seed) => {
    const { game } = get()
    set({
      game: {
        ...game,
        tiles: generateProceduralMap({ width: MAP_WIDTH, height: MAP_HEIGHT }, seed ?? Date.now()),
      },
      activeMapWidth: MAP_WIDTH,
      activeMapHeight: MAP_HEIGHT,
      editorDirty: true,
    })
  },
  generateEarthMap: (seed) => {
    const { game } = get()
    set({
      game: {
        ...game,
        tiles: generateEarthLikeMap({ width: MAP_WIDTH, height: MAP_HEIGHT }, seed ?? Date.now()),
      },
      activeMapWidth: MAP_WIDTH,
      activeMapHeight: MAP_HEIGHT,
      editorDirty: true,
    })
  },
  setSelectedTerrain: (t) =>
    set((s) => ({ builder: { ...s.builder, selectedTerrain: t, mode: 'terrain' } })),
  setSelectedResource: (r) =>
    set((s) => ({ builder: { ...s.builder, selectedResource: r, mode: 'resource' } })),
  setViewMode: (m) => set({ viewMode: m }),
  setViewingTile: (key) => set({ viewingTileKey: key }),
  setAddingCityAt: (key) => set({ addingCityAtKey: key }),
  setSelectedVegetation: (v) =>
    set((s) => ({ builder: { ...s.builder, selectedVegetation: v, mode: 'vegetation' } })),
  addCity: (tileKey, name, population) => {
    const { game } = get()
    const tile = game.tiles[tileKey]
    if (!tile) return
    const cityId = 'city-' + tileKey
    const newCity: City = {
      id: cityId,
      civId: null,
      name,
      coord: tile.coord,
      population,
      productionQueue: [],
      culture: 0,
      isCapital: false,
      growthRateBonus: 0,
    }
    set({
      game: {
        ...game,
        cities: [...game.cities, newCity],
        tiles: { ...game.tiles, [tileKey]: { ...tile, cityId } },
      },
      editorDirty: true,
    })
  },
  removeCity: (tileKey) => {
    const { game } = get()
    const tile = game.tiles[tileKey]
    if (!tile || !tile.cityId) return
    const cityId = tile.cityId
    set({
      game: {
        ...game,
        cities: game.cities.filter((c) => c.id !== cityId),
        tiles: { ...game.tiles, [tileKey]: { ...tile, cityId: null } },
      },
      editorDirty: true,
      selectedEditorCityId: get().selectedEditorCityId === cityId ? null : get().selectedEditorCityId,
    })
  },
  updateCity: (cityId, updates) => {
    const { game } = get()
    if (!game.cities.some((c) => c.id === cityId)) return
    set({
      game: {
        ...game,
        cities: game.cities.map((c) => (c.id === cityId ? { ...c, ...updates } : c)),
      },
      editorDirty: true,
    })
  },
  clearTileExtras: (centerKey) => {
    const { game, builder } = get()
    const centerTile = game.tiles[centerKey]
    if (!centerTile) return
    const affected =
      builder.brushRadius === 0
        ? [centerTile]
        : Object.values(game.tiles).filter(
            (t) => hexDistance(t.coord, centerTile.coord) <= builder.brushRadius,
          )
    const updatedTiles = { ...game.tiles }
    for (const tile of affected) {
      clearTileFields(updatedTiles, tileKey(tile.coord))
    }
    set({ game: { ...game, tiles: updatedTiles }, editorDirty: true })
  },
  toggleRiverEdge: (centerKey, edgeIndex) => {
    const { game } = get()
    const tile = game.tiles[centerKey]
    if (!tile) return
    const dir = (6 - edgeIndex) % 6
    const neighborList = neighbors(tile.coord)
    const neighborCoord = neighborList[dir]
    const neighborKey = tileKey(neighborCoord)
    const neighborTile = game.tiles[neighborKey]

    const hasEdge = tile.riverDirections.includes(dir)
    const updatedTiles = { ...game.tiles }

    const newCenterDirections = hasEdge
      ? tile.riverDirections.filter((d) => d !== dir)
      : [...tile.riverDirections, dir]
    updatedTiles[centerKey] = { ...tile, riverDirections: newCenterDirections }

    if (neighborTile) {
      const mirrorDir = (dir + 3) % 6
      const newNeighborDirections = hasEdge
        ? neighborTile.riverDirections.filter((d) => d !== mirrorDir)
        : neighborTile.riverDirections.includes(mirrorDir)
          ? neighborTile.riverDirections
          : [...neighborTile.riverDirections, mirrorDir]
      updatedTiles[neighborKey] = { ...neighborTile, riverDirections: newNeighborDirections }
    }

    set({ game: { ...game, tiles: updatedTiles }, editorDirty: true })
  },
  addCivilization: (name, color, cultureName, flagEmoji) => {
    const { game } = get()
    const newCiv: Civilization = {
      id: 'civ-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      name,
      color,
      playerType: 'ai',
      cultureName,
      flagEmoji,
      capitalCityId: null,
    }
    set({ game: { ...game, civilizations: [...game.civilizations, newCiv] } })
  },
  removeCivilization: (civId) => {
    const { game } = get()
    set({
      game: {
        ...game,
        civilizations: game.civilizations.filter((c) => c.id !== civId),
        cities: game.cities.map((c) => (c.civId === civId ? { ...c, civId: null, isCapital: false } : c)),
      },
    })
  },
  updateCivilization: (civId, updates) => {
    const { game } = get()
    set({
      game: {
        ...game,
        civilizations: game.civilizations.map((c) => (c.id === civId ? { ...c, ...updates } : c)),
      },
    })
  },
  setAssigningCapitalFor: (civId) => set({ assigningCapitalForCivId: civId }),
  assignCapital: (civId, cityId) => {
    const { game } = get()
    const targetCiv = game.civilizations.find((c) => c.id === civId)
    if (!targetCiv) return
    set({
      game: {
        ...game,
        civilizations: game.civilizations.map((c) =>
          c.id === civId ? { ...c, capitalCityId: cityId } : c,
        ),
        cities: game.cities.map((c) => {
          if (c.id === cityId) return { ...c, civId, isCapital: true }
          // if this civ already had a different capital, demote it
          if (c.civId === civId && c.isCapital && c.id !== cityId) return { ...c, isCapital: false }
          return c
        }),
      },
      assigningCapitalForCivId: null,
    })
  },
  setMode: (m) => set((s) => ({ builder: { ...s.builder, mode: m } })),
  setBrushRadius: (r) => set((s) => ({ builder: { ...s.builder, brushRadius: r } })),
  setGameSettings: (updates) => {
    const { game } = get()
    set({ game: { ...game, settings: { ...game.settings, ...updates } } })
  },
  setCityGrowthBonus: (cityId, bonus) => {
    const { game } = get()
    set({
      game: {
        ...game,
        cities: game.cities.map((c) => (c.id === cityId ? { ...c, growthRateBonus: bonus } : c)),
      },
      editorDirty: true,
    })
  },
  startGame: (startYear, yearsPerTurn) => {
    set({
      gamePhase: 'playing',
      currentYear: startYear,
      yearsPerTurn,
      viewMode: 'view',
    })
  },
  endTurn: () => {
    const { game } = get()
    const settings = game.settings

    // 1. Growth
    let cities = game.cities.map((city) => {
      const rate = settings.baseGrowthRate + city.growthRateBonus
      const grown = Math.max(city.population + 1, Math.round(city.population * (1 + rate)))
      return { ...city, population: grown }
    })

    // 2. Capital culture accumulation
    cities = cities.map((city) =>
      city.isCapital && city.civId ? { ...city, culture: city.culture + settings.capitalCulturePerTurn } : city,
    )

    // 3. Annexation: each capital with enough culture claims the nearest
    // unclaimed (civId === null) city, if one exists anywhere on the map.
    const unclaimedCities = () => cities.filter((c) => c.civId === null)

    for (const capital of cities.filter((c) => c.isCapital && c.civId && c.culture >= settings.cultureAnnexThreshold)) {
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
      cities = cities.map((c) => {
        if (c.id === nearest!.id) return { ...c, civId: capital.civId }
        if (c.id === capital.id) return { ...c, culture: c.culture - settings.cultureAnnexThreshold }
        return c
      })
    }

    set({
      game: { ...game, cities, turn: game.turn + 1 },
      currentYear: get().currentYear + get().yearsPerTurn,
    })
  },
  exportMap: () => {
    const { game, activeMapWidth, activeMapHeight } = get()
    const payload = {
      version: 1,
      mapWidth: activeMapWidth,
      mapHeight: activeMapHeight,
      savedAt: new Date().toISOString(),
      tiles: game.tiles,
      cities: game.cities,
      civilizations: game.civilizations,
      settings: game.settings,
    }
    return JSON.stringify(payload, null, 2)
  },
  importMap: (json) => {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object' || !parsed.tiles) {
        return { success: false, error: 'Файл не похож на сохранённую карту (нет поля tiles).' }
      }
      const { game } = get()
      const width =
        Number.isInteger(parsed.mapWidth) && parsed.mapWidth > 0 ? parsed.mapWidth : get().activeMapWidth
      const height =
        Number.isInteger(parsed.mapHeight) && parsed.mapHeight > 0 ? parsed.mapHeight : get().activeMapHeight
      set({
        game: {
          ...game,
          tiles: parsed.tiles,
          cities: parsed.cities ?? [],
          civilizations: parsed.civilizations ?? game.civilizations,
          settings: parsed.settings ? { ...game.settings, ...parsed.settings } : game.settings,
        },
        activeMapWidth: width,
        activeMapHeight: height,
        editorDirty: true,
      })
      return { success: true }
    } catch (e) {
      return { success: false, error: 'Не удалось разобрать JSON: файл повреждён или неверного формата.' }
    }
  },
  loadSelectedCatalogMap: (input) => {
    const { game } = get()
    set({
      game: {
        ...game,
        tiles: input.tiles,
        cities: input.cities,
        turn: 1,
        units: [],
      },
      activeCatalogMapId: input.catalogMapId,
      activeCatalogMapName: input.catalogMapName,
      activeCatalogMapDescription: input.catalogMapDescription,
      activeCatalogMapVersion: input.catalogMapVersion,
      activeCatalogMapCreatedAt: input.catalogMapCreatedAt,
      activeMapWidth: input.width,
      activeMapHeight: input.height,
      editorDirty: false,
      lastSavedAt: input.lastSavedAt,
      catalogBridge: { mapId: input.catalogMapId, mapName: input.catalogMapName },
      gamePhase: 'setup',
      viewMode: 'edit',
      viewingTileKey: null,
      addingCityAtKey: null,
      assigningCapitalForCivId: null,
      currentYear: 0,
    })
  },
  loadCatalogMapBridge: (input) => {
    get().loadSelectedCatalogMap({
      ...input,
      catalogMapDescription: '',
      catalogMapVersion: 1,
      catalogMapCreatedAt: new Date().toISOString(),
      width: get().activeMapWidth,
      height: get().activeMapHeight,
      lastSavedAt: new Date().toISOString(),
    })
  },
}))
