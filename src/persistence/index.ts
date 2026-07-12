/**
 * Persistence layer (F3) — IndexedDB via Dexie behind repository interfaces.
 *
 * Not wired into UI / Zustand / v1 JSON export. Catalogs and New Game use this in F4+.
 */

export {
  PRODUCTION_DATABASE_NAME,
  DATABASE_SCHEMA_VERSION,
  STORE_NAMES,
  SCHEMA_V1_STORES,
} from './schema'

export { PersistenceError, isPersistenceError, wrapPersistenceError } from './errors'
export type { PersistenceErrorCode } from './errors'

export {
  CivBrowserDatabase,
  getDatabase,
  openDatabase,
  closeDatabase,
  deleteDatabase,
} from './database'

export {
  createPersistenceServices,
  createMapRepository,
  createCivilizationRepository,
  createRulesPresetRepository,
  createGameSessionRepository,
} from './repositories'
export type {
  MapRepository,
  CivilizationRepository,
  RulesPresetRepository,
  GameSessionRepository,
  PersistenceServices,
} from './repositories'

export { seedDefaults, createStandardRulesPreset, STANDARD_RULES_PRESET_ID } from './seed'

export { runPersistenceVerification } from './verification'
export type { PersistenceVerificationReport } from './verification'

import { openDatabase } from './database'
import { createPersistenceServices, type PersistenceServices } from './repositories'
import { PRODUCTION_DATABASE_NAME } from './schema'
import { seedDefaults } from './seed'

/** Open DB and create repositories. Seeding is opt-in (not run on every open). */
export async function createPersistence(options?: {
  databaseName?: string
  seed?: boolean
}): Promise<PersistenceServices> {
  const db = await openDatabase(options?.databaseName ?? PRODUCTION_DATABASE_NAME)
  const services = createPersistenceServices(db)
  if (options?.seed) {
    await seedDefaults(services.rulesPresets)
  }
  return services
}
