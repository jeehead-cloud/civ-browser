import Dexie, { type Table } from 'dexie'
import type { CivilizationTemplate } from '../domain/civilizations'
import type { GameSession } from '../domain/gameSession'
import type { MapTemplate } from '../domain/maps'
import type { GameRulesPreset } from '../domain/rules'
import { PersistenceError, wrapPersistenceError } from './errors'
import {
  DATABASE_SCHEMA_VERSION,
  PRODUCTION_DATABASE_NAME,
  SCHEMA_V1_STORES,
} from './schema'

/**
 * Civ Browser IndexedDB via Dexie.
 * Schema version upgrades are additive through Dexie `this.version(n).stores(...)`.
 */
export class CivBrowserDatabase extends Dexie {
  maps!: Table<MapTemplate, string>
  civilizations!: Table<CivilizationTemplate, string>
  rulesPresets!: Table<GameRulesPreset, string>
  gameSessions!: Table<GameSession, string>

  constructor(databaseName: string = PRODUCTION_DATABASE_NAME) {
    super(databaseName)
    this.version(DATABASE_SCHEMA_VERSION).stores(SCHEMA_V1_STORES)
  }
}

const databases = new Map<string, CivBrowserDatabase>()

export function getDatabase(databaseName: string = PRODUCTION_DATABASE_NAME): CivBrowserDatabase {
  let db = databases.get(databaseName)
  if (!db) {
    db = new CivBrowserDatabase(databaseName)
    databases.set(databaseName, db)
  }
  return db
}

export async function openDatabase(
  databaseName: string = PRODUCTION_DATABASE_NAME,
): Promise<CivBrowserDatabase> {
  const db = getDatabase(databaseName)
  try {
    if (!db.isOpen()) await db.open()
    return db
  } catch (cause) {
    throw wrapPersistenceError(
      'database_open',
      'openDatabase',
      `Failed to open database "${databaseName}"`,
      cause,
    )
  }
}

export async function closeDatabase(databaseName: string = PRODUCTION_DATABASE_NAME): Promise<void> {
  const db = databases.get(databaseName)
  if (!db) return
  try {
    if (db.isOpen()) db.close()
  } catch (cause) {
    throw wrapPersistenceError('database_open', 'closeDatabase', 'Failed to close database', cause)
  }
}

/** Delete an IndexedDB database (verification / test cleanup only). */
export async function deleteDatabase(databaseName: string): Promise<void> {
  await closeDatabase(databaseName)
  databases.delete(databaseName)
  try {
    await Dexie.delete(databaseName)
  } catch (cause) {
    throw new PersistenceError(
      'database_open',
      'deleteDatabase',
      `Failed to delete database "${databaseName}"`,
      { cause },
    )
  }
}
