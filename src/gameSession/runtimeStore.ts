import { create } from 'zustand'
import type { AxialCoord } from '../game/types'
import { applyTurn, isAtMaximumTurns } from './turnEngine'
import { emptyRuntimeState, hydrateRuntimeFromSession } from './runtimeAdapters'
import { loadGameSession, saveGameSessionFromRuntime } from './sessionService'
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
}

let turnInFlight = false

/** Test helper */
export function resetActiveGameTurnGuard(): void {
  turnInFlight = false
}

export const useActiveGameStore = create<ActiveGameStore>((set, get) => ({
  ...emptyRuntimeState(),

  reset: () => {
    turnInFlight = false
    set(emptyRuntimeState())
  },

  loadSession: async (gameId: string) => {
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

  save: async () => {
    const state = get()
    if (!state.sessionId || state.loadStatus !== 'ready') return false
    set({ saveStatus: 'saving', saveError: null })
    const result = await saveGameSessionFromRuntime(get())
    if (!result.ok) {
      set({ saveStatus: 'error', saveError: result.error })
      return false
    }
    set({
      saveStatus: 'saved',
      lastSavedAt: result.session.updatedAt,
      updatedAt: result.session.updatedAt,
      dirty: false,
      saveError: null,
      events: result.session.events ?? get().events,
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
      const outcome = applyTurn({
        cities: state.cities,
        settings: state.rules.settings,
        turn: state.turn,
        currentYear: state.currentYear,
        yearsPerTurn: state.yearsPerTurn,
        maximumTurns: state.maximumTurns,
      })
      if (!outcome.ok) {
        set({ runtimeError: outcome.error, turnBusy: false })
        return
      }

      set({
        cities: outcome.value.cities,
        turn: outcome.value.turn,
        currentYear: outcome.value.currentYear,
        events: [...state.events, ...outcome.value.events],
        dirty: true,
        turnBusy: false,
        saveStatus: 'saving',
        saveError: null,
      })

      // Autosave after successful turn — do not re-run turn on save failure
      const saved = await get().save()
      if (!saved) {
        // Runtime already advanced; leave dirty + error for Retry Save
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
