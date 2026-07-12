import { validateGameSession } from '../../domain/validators'
import type { CivBrowserDatabase } from '../database'
import { deleteById, getCloned, listCloned, saveValidated } from './helpers'
import type { GameSessionRepository } from './types'

export function createGameSessionRepository(db: CivBrowserDatabase): GameSessionRepository {
  return {
    list: () => listCloned('gameSessions.list', () => db.gameSessions.toArray()),
    get: (id) => getCloned('gameSessions.get', () => db.gameSessions.get(id)),
    save: (session) =>
      saveValidated(
        'gameSessions.save',
        session,
        (value) => validateGameSession(value),
        (value) => db.gameSessions.put(value),
      ),
    delete: (id) => deleteById('gameSessions.delete', () => db.gameSessions.delete(id)),
  }
}
