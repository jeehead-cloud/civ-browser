import { createPersistence, isPersistenceError, type PersistenceServices } from '../persistence'

let persistencePromise: Promise<PersistenceServices> | null = null

export interface CatalogPersistenceOptions {
  /** Isolated DB name for verification; defaults to production name in the app. */
  databaseName?: string
  seed?: boolean
}

/** Lazy singleton for catalog screens — seeds Standard rules once, does not open on every render. */
export function getCatalogPersistence(
  options?: CatalogPersistenceOptions,
): Promise<PersistenceServices> {
  if (!persistencePromise) {
    persistencePromise = createPersistence({
      seed: options?.seed ?? true,
      databaseName: options?.databaseName,
    }).catch((err) => {
      persistencePromise = null
      throw err
    })
  }
  return persistencePromise
}

/** Test helper — reset singleton between isolated DB runs. */
export function resetCatalogPersistenceSingleton(): void {
  persistencePromise = null
}

export function catalogErrorMessage(error: unknown, fallback: string): string {
  if (isPersistenceError(error)) {
    if (error.code === 'validation' && error.details?.length) {
      return error.details.join('; ')
    }
    return error.message || fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
