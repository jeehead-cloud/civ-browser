/** IndexedDB schema constants for Civ Browser (F3). Separate from domain entity `version`. */

export const PRODUCTION_DATABASE_NAME = 'civ-browser'

/** Current IndexedDB schema version (Dexie DB version). */
export const DATABASE_SCHEMA_VERSION = 1

export const STORE_NAMES = {
  maps: 'maps',
  civilizations: 'civilizations',
  rulesPresets: 'rulesPresets',
  gameSessions: 'gameSessions',
} as const

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES]

/**
 * Dexie store definitions for schema version 1.
 * Primary key is entity `id`. Indexes support list ordering and name lookup.
 */
export const SCHEMA_V1_STORES = {
  maps: 'id, updatedAt, name',
  civilizations: 'id, updatedAt, name',
  rulesPresets: 'id, updatedAt, name',
  gameSessions: 'id, updatedAt, name',
} as const
