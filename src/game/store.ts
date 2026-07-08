import { create } from 'zustand'
import { GameState, Tile, TerrainType, ResourceType } from './types'
import { hexDistance, tileKey } from './hexGrid'
import { generateProceduralMap } from './mapGenerator'

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

interface BuilderState {
  selectedTerrain: TerrainType
  selectedResource: ResourceType
  mode: 'terrain' | 'resource' | 'city' | 'hills'
  brushRadius: number // 0 = один гекс, 1 = гекс + соседи, и т.д.
}

interface Store {
  game: GameState
  builder: BuilderState
  paintAt: (center: string) => void
  regenerateMap: (seed?: number) => void
  setSelectedTerrain: (t: TerrainType) => void
  setSelectedResource: (r: ResourceType) => void
  setMode: (m: BuilderState['mode']) => void
  setBrushRadius: (r: number) => void
  exportMap: () => string
  importMap: (json: string) => { success: boolean; error?: string }
}

export const useGameStore = create<Store>((set, get) => ({
  game: {
    tiles: createInitialTiles(),
    cities: [],
    units: [],
    civilizations: [
      { id: 'player', name: 'Игрок', color: '#3b82f6', playerType: 'human' },
      { id: 'ai-1', name: 'Соперник A', color: '#ef4444', playerType: 'ai' },
    ],
    turn: 1,
  },
  builder: {
    selectedTerrain: 'grassland',
    selectedResource: 'none',
    mode: 'terrain',
    brushRadius: 0,
  },
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
      set({ game: { ...game, tiles: updatedTiles } })
      return
    }

    for (const tile of affected) {
      const key = tileKey(tile.coord)
      const updated: Tile = { ...tile }
      if (builder.mode === 'terrain') {
        updated.terrain = builder.selectedTerrain
      } else if (builder.mode === 'resource') {
        updated.resource = builder.selectedResource
      } else if (builder.mode === 'city') {
        if (key === centerKey) {
          updated.cityId = updated.cityId ? null : 'city-' + key
        }
      }
      updatedTiles[key] = updated
    }

    set({ game: { ...game, tiles: updatedTiles } })
  },
  regenerateMap: (seed) => {
    const { game } = get()
    set({
      game: {
        ...game,
        tiles: generateProceduralMap({ width: MAP_WIDTH, height: MAP_HEIGHT }, seed ?? Date.now()),
      },
    })
  },
  setSelectedTerrain: (t) =>
    set((s) => ({ builder: { ...s.builder, selectedTerrain: t, mode: 'terrain' } })),
  setSelectedResource: (r) =>
    set((s) => ({ builder: { ...s.builder, selectedResource: r, mode: 'resource' } })),
  setMode: (m) => set((s) => ({ builder: { ...s.builder, mode: m } })),
  setBrushRadius: (r) => set((s) => ({ builder: { ...s.builder, brushRadius: r } })),
  exportMap: () => {
    const { game } = get()
    const payload = {
      version: 1,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      savedAt: new Date().toISOString(),
      tiles: game.tiles,
      civilizations: game.civilizations,
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
      set({
        game: {
          ...game,
          tiles: parsed.tiles,
          civilizations: parsed.civilizations ?? game.civilizations,
        },
      })
      return { success: true }
    } catch (e) {
      return { success: false, error: 'Не удалось разобрать JSON: файл повреждён или неверного формата.' }
    }
  },
}))
