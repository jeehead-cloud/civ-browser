import { deepClone } from '../domain/adapters'
import type { GameSession } from '../domain/gameSession'
import { validateGameSession } from '../domain/validators'
import {
  catalogErrorMessage,
  getCatalogPersistence,
  type CatalogPersistenceOptions,
} from '../catalog/persistence'
import { isoNow } from '../catalog/mapFactory'
import { runtimeToGameSession } from './selectors'
import type { ActiveRuntimeState } from './types'

export type SessionServiceOptions = CatalogPersistenceOptions

export async function loadGameSession(
  id: string,
  options?: SessionServiceOptions,
): Promise<
  | { ok: true; session: GameSession }
  | { ok: false; code: 'not-found' | 'invalid' | 'error'; error: string }
> {
  try {
    const services = await getCatalogPersistence(options)
    const loaded = await services.gameSessions.get(id)
    if (!loaded) return { ok: false, code: 'not-found', error: 'Game session not found' }
    const validated = validateGameSession(loaded)
    if (!validated.ok) {
      return { ok: false, code: 'invalid', error: validated.errors.join('; ') }
    }
    return { ok: true, session: deepClone(validated.value) }
  } catch (err) {
    return {
      ok: false,
      code: 'error',
      error: catalogErrorMessage(err, 'Failed to load game session'),
    }
  }
}

export async function listGameSessions(options?: SessionServiceOptions): Promise<GameSession[]> {
  const services = await getCatalogPersistence(options)
  return services.gameSessions.list()
}

/** Most recently updated session, or null if none. */
export async function getMostRecentGameSession(
  options?: SessionServiceOptions,
): Promise<GameSession | null> {
  const list = await listGameSessions(options)
  if (list.length === 0) return null
  return list[0]
}

export function sessionFromRuntime(state: ActiveRuntimeState): GameSession | null {
  if (!state.sessionId || !state.rules || !state.createdAt) return null
  return runtimeToGameSession({
    id: state.sessionId,
    name: state.name,
    version: state.version,
    sourceMap: state.sourceMap,
    width: state.width,
    height: state.height,
    tiles: state.tiles,
    cities: state.cities,
    civilizations: state.civilizations,
    rules: state.rules,
    turn: state.turn,
    currentYear: state.currentYear,
    yearsPerTurn: state.yearsPerTurn,
    maximumTurns: state.maximumTurns,
    createdAt: state.createdAt,
    updatedAt: isoNow(),
    events: state.events,
  })
}

export async function saveGameSessionFromRuntime(
  state: ActiveRuntimeState,
  options?: SessionServiceOptions,
): Promise<
  | { ok: true; session: GameSession }
  | { ok: false; error: string }
> {
  const session = sessionFromRuntime(state)
  if (!session) return { ok: false, error: 'Runtime is not ready to save' }
  const validated = validateGameSession(session)
  if (!validated.ok) return { ok: false, error: validated.errors.join('; ') }

  try {
    const services = await getCatalogPersistence(options)
    await services.gameSessions.save(validated.value)
    const verified = await services.gameSessions.get(validated.value.id)
    if (!verified) return { ok: false, error: 'Save succeeded but reload failed' }
    return { ok: true, session: verified }
  } catch (err) {
    return { ok: false, error: catalogErrorMessage(err, 'Failed to save game session') }
  }
}
