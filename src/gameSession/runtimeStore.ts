import { create } from 'zustand'
import type { AxialCoord, ResourceType, TerrainType, VegetationType } from '../game/types'
import { isoNow } from '../catalog/mapFactory'
import type { GameSessionEvent } from '../domain/gameSession'
import { applyTurn, isAtMaximumTurns } from './turnEngine'
import { emptyDebugState, emptyRuntimeState, hydrateRuntimeFromSession } from './runtimeAdapters'
import { loadGameSession, saveGameSessionFromRuntime } from './sessionService'
import { isDebugEditingAvailable } from './debugAvailability'
import {
  applyDebugEdit,
  type DebugEditRequest,
  type DebugInteractionMode,
  type DebugTool,
  type DebugToolSettings,
} from './debugOps'
import type { ActivePanelTab, ActiveRuntimeState } from './types'

interface ActiveGameStore extends ActiveRuntimeState {
  reset: () => void
  loadSession: (gameId: string) => Promise<void>
  selectTile: (tileKey: string | null) => void
  setPanelTab: (tab: ActivePanelTab) => void
  focusCoord: (coord: AxialCoord) => void
  endTurn: () => Promise<void>
  save: () => Promise<boolean>
  clearRuntimeError: () => void
  /** Confirm-gated enable — caller must show dialog first. */
  enableDebugEditing: () => { ok: boolean; error?: string }
  disableDebugEditing: () => void
  setDebugInteractionMode: (mode: DebugInteractionMode) => void
  setDebugTool: (tool: DebugTool) => void
  setDebugTerrain: (terrain: TerrainType) => void
  setDebugFeature: (feature: VegetationType) => void
  setDebugResource: (resource: ResourceType) => void
  setDebugElevationAction: (action: DebugToolSettings['elevationAction']) => void
  applyDebugEditAt: (tileKey: string, riverEdgeIndex?: number) => { ok: boolean; error?: string }
  clearDebugEditMessage: () => void
}

let turnInFlight = false

/** Test helper */
export function resetActiveGameTurnGuard(): void {
  turnInFlight = false
}

function makeDebugSaveEvent(
  state: ActiveRuntimeState,
  changedTileCount: number,
): GameSessionEvent {
  return {
    id: `evt-debug-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    turn: state.turn,
    year: state.currentYear,
    type: 'debug_edit_saved',
    message: `Debug edit saved (${changedTileCount} tile${changedTileCount === 1 ? '' : 's'} changed)`,
    data: { changedTileCount, system: true, debug: true },
    createdAt: isoNow(),
  }
}

export const useActiveGameStore = create<ActiveGameStore>((set, get) => ({
  ...emptyRuntimeState(),

  reset: () => {
    turnInFlight = false
    set(emptyRuntimeState())
  },

  loadSession: async (gameId) => {
    set({
      ...emptyRuntimeState(),
      loadStatus: 'loading',
      loadError: null,
    })
    const result = await loadGameSession(gameId)
    if (!result.ok) {
      set({
        ...emptyRuntimeState(),
        loadStatus: result.code === 'not-found' ? 'not-found' : 'error',
        loadError: result.error,
      })
      return
    }
    set({
      ...emptyRuntimeState(),
      ...hydrateRuntimeFromSession(result.session),
    })
  },

  selectTile: (tileKey) => set({ selectedTileKey: tileKey }),

  setPanelTab: (tab) => set({ panelTab: tab }),

  focusCoord: (coord) =>
    set((s) => ({
      cameraFocus: { coord, nonce: (s.cameraFocus?.nonce ?? 0) + 1 },
    })),

  clearRuntimeError: () => set({ runtimeError: null }),

  clearDebugEditMessage: () =>
    set((s) => ({
      debug: { ...s.debug, lastEditMessage: null },
    })),

  enableDebugEditing: () => {
    if (!isDebugEditingAvailable()) {
      return { ok: false, error: 'Debug editing is not available in this build' }
    }
    if (get().loadStatus !== 'ready') {
      return { ok: false, error: 'Session is not ready' }
    }
    set((s) => ({
      debug: {
        ...s.debug,
        enabled: true,
        interactionMode: 'inspect',
        lastEditMessage: null,
      },
    }))
    return { ok: true }
  },

  disableDebugEditing: () =>
    set((s) => ({
      debug: {
        ...s.debug,
        enabled: false,
        interactionMode: 'inspect',
        lastEditMessage: null,
      },
      // Do not discard edits — only leave edit mode
    })),

  setDebugInteractionMode: (mode) => {
    if (!get().debug.enabled) return
    set((s) => ({
      debug: { ...s.debug, interactionMode: mode },
      // Leaving Edit closes selection paint context; Inspect restores popups
      selectedTileKey: mode === 'edit' ? null : s.selectedTileKey,
    }))
  },

  setDebugTool: (tool) => {
    if (!get().debug.enabled) return
    set((s) => ({ debug: { ...s.debug, tool } }))
  },

  setDebugTerrain: (terrain) => {
    if (!get().debug.enabled) return
    set((s) => ({
      debug: { ...s.debug, settings: { ...s.debug.settings, terrain }, tool: 'terrain' },
    }))
  },

  setDebugFeature: (feature) => {
    if (!get().debug.enabled) return
    set((s) => ({
      debug: { ...s.debug, settings: { ...s.debug.settings, feature }, tool: 'features' },
    }))
  },

  setDebugResource: (resource) => {
    if (!get().debug.enabled) return
    set((s) => ({
      debug: { ...s.debug, settings: { ...s.debug.settings, resource }, tool: 'resources' },
    }))
  },

  setDebugElevationAction: (action) => {
    if (!get().debug.enabled) return
    set((s) => ({
      debug: { ...s.debug, settings: { ...s.debug.settings, elevationAction: action } },
    }))
  },

  applyDebugEditAt: (tileKey, riverEdgeIndex) => {
    const state = get()
    if (!isDebugEditingAvailable() || !state.debug.enabled) {
      return { ok: false, error: 'Debug editing is not enabled' }
    }
    if (state.debug.interactionMode !== 'edit') {
      return { ok: false, error: 'Switch to Edit mode to paint' }
    }
    if (state.loadStatus !== 'ready') {
      return { ok: false, error: 'Session is not ready' }
    }

    const request: DebugEditRequest = {
      tool: state.debug.tool,
      tileKey,
      settings: state.debug.settings,
      riverEdgeIndex,
    }
    const result = applyDebugEdit(state.tiles, request)
    if (!result.ok || !result.tiles) {
      const msg = result.message ?? result.error ?? 'Edit failed'
      set((s) => ({
        debug: { ...s.debug, lastEditMessage: msg },
      }))
      return { ok: false, error: msg }
    }

    const delta = result.changedKeys?.length ?? 0
    set({
      tiles: result.tiles,
      dirty: true,
      selectedTileKey: null,
      debug: {
        ...state.debug,
        pendingChangedTileCount: state.debug.pendingChangedTileCount + delta,
        lastEditMessage: null,
      },
      saveStatus: state.saveStatus === 'saving' ? 'saving' : 'idle',
    })
    return { ok: true }
  },

  save: async () => {
    const state = get()
    if (!state.sessionId || state.loadStatus !== 'ready') return false

    const pendingDebug = state.debug.pendingChangedTileCount
    const eventsForSave =
      pendingDebug > 0
        ? [...state.events, makeDebugSaveEvent(state, pendingDebug)]
        : state.events

    set({ saveStatus: 'saving', saveError: null, events: eventsForSave })
    const result = await saveGameSessionFromRuntime(get())
    if (!result.ok) {
      // Roll back ephemeral debug event so retry does not duplicate
      set({
        saveStatus: 'error',
        saveError: result.error,
        events: state.events,
      })
      return false
    }
    set({
      saveStatus: 'saved',
      lastSavedAt: result.session.updatedAt,
      updatedAt: result.session.updatedAt,
      dirty: false,
      saveError: null,
      events: result.session.events ?? eventsForSave,
      debug: {
        ...get().debug,
        pendingChangedTileCount: 0,
        lastEditMessage: null,
      },
    })
    return true
  },

  endTurn: async () => {
    if (turnInFlight) return
    const state = get()
    if (state.loadStatus !== 'ready' || !state.rules || state.turnBusy) return
    if (isAtMaximumTurns(state.turn, state.maximumTurns)) {
      set({ runtimeError: 'Maximum turns reached for this session' })
      return
    }

    turnInFlight = true
    set({ turnBusy: true, runtimeError: null })
    try {
      // Policy: persist unsaved runtime (including debug edits) before turn.
      if (state.dirty) {
        const preSaved = await get().save()
        if (!preSaved) {
          set({
            turnBusy: false,
            runtimeError: 'Save failed — fix save error before Next Turn',
          })
          return
        }
      }

      const current = get()
      const outcome = applyTurn({
        cities: current.cities,
        settings: current.rules!.settings,
        turn: current.turn,
        currentYear: current.currentYear,
        yearsPerTurn: current.yearsPerTurn,
        maximumTurns: current.maximumTurns,
      })
      if (!outcome.ok) {
        set({ runtimeError: outcome.error, turnBusy: false })
        return
      }

      set({
        cities: outcome.value.cities,
        turn: outcome.value.turn,
        currentYear: outcome.value.currentYear,
        events: [...get().events, ...outcome.value.events],
        dirty: true,
        turnBusy: false,
        saveStatus: 'saving',
        saveError: null,
      })

      const saved = await get().save()
      if (!saved) {
        set({ dirty: true })
      }
    } catch (err) {
      set({
        turnBusy: false,
        runtimeError: err instanceof Error ? err.message : 'Turn processing failed',
      })
    } finally {
      turnInFlight = false
    }
  },
}))
