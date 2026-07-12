import { deepClone } from '../domain/adapters'
import type { GameSession } from '../domain/gameSession'
import { DEFAULT_DEBUG_TOOL_SETTINGS } from './debugOps'
import type { ActiveDebugState, ActiveRuntimeState } from './types'

export function emptyDebugState(): ActiveDebugState {
  return {
    enabled: false,
    interactionMode: 'inspect',
    tool: 'terrain',
    settings: { ...DEFAULT_DEBUG_TOOL_SETTINGS },
    pendingChangedTileCount: 0,
    lastEditMessage: null,
  }
}

export function emptyRuntimeState(): ActiveRuntimeState {
  return {
    loadStatus: 'idle',
    loadError: null,
    sessionId: null,
    name: '',
    width: 0,
    height: 0,
    tiles: {},
    cities: [],
    civilizations: [],
    rules: null,
    turn: 1,
    currentYear: 0,
    yearsPerTurn: 10,
    maximumTurns: undefined,
    createdAt: null,
    updatedAt: null,
    version: 1,
    sourceMap: undefined,
    events: [],
    selectedTileKey: null,
    cameraFocus: null,
    panelTab: 'overview',
    saveStatus: 'idle',
    lastSavedAt: null,
    saveError: null,
    turnBusy: false,
    runtimeError: null,
    dirty: false,
    debug: emptyDebugState(),
  }
}

/** Deep-copy session into isolated runtime fields (no shared refs). */
export function hydrateRuntimeFromSession(session: GameSession): Partial<ActiveRuntimeState> {
  const copy = deepClone(session)
  return {
    loadStatus: 'ready',
    loadError: null,
    sessionId: copy.id,
    name: copy.name,
    width: copy.width,
    height: copy.height,
    tiles: copy.tiles,
    cities: copy.cities,
    civilizations: copy.civilizations,
    rules: copy.rules,
    turn: copy.turn,
    currentYear: copy.currentYear,
    yearsPerTurn: copy.yearsPerTurn,
    maximumTurns: copy.maximumTurns,
    createdAt: copy.createdAt,
    updatedAt: copy.updatedAt,
    version: copy.version,
    sourceMap: copy.sourceMap,
    events: copy.events ? [...copy.events] : [],
    selectedTileKey: null,
    cameraFocus: null,
    saveStatus: 'saved',
    lastSavedAt: copy.updatedAt,
    saveError: null,
    turnBusy: false,
    runtimeError: null,
    dirty: false,
    /** Always disabled on load/rehydrate — never persisted. */
    debug: emptyDebugState(),
  }
}
