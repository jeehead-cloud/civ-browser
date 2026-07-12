import { deepClone } from '../../domain/adapters'
import type { ConversionResult } from '../../domain/result'
import { PersistenceError, wrapPersistenceError } from '../errors'
import type { CivBrowserDatabase } from '../database'

function isoNow(): string {
  return new Date().toISOString()
}

function byUpdatedAtDesc<T extends { updatedAt: string }>(a: T, b: T): number {
  return b.updatedAt.localeCompare(a.updatedAt)
}

export async function listCloned<T extends { updatedAt: string }>(
  operation: string,
  load: () => Promise<T[]>,
): Promise<T[]> {
  try {
    const rows = await load()
    return deepClone(rows).sort(byUpdatedAtDesc)
  } catch (cause) {
    throw wrapPersistenceError('read', operation, 'Failed to list records', cause)
  }
}

export async function getCloned<T>(
  operation: string,
  load: () => Promise<T | undefined>,
): Promise<T | null> {
  try {
    const row = await load()
    return row == null ? null : deepClone(row)
  } catch (cause) {
    throw wrapPersistenceError('read', operation, 'Failed to read record', cause)
  }
}

export async function saveValidated<T extends { id: string; createdAt: string; updatedAt: string }>(
  operation: string,
  entity: T,
  validate: (value: T) => ConversionResult<T>,
  put: (value: T) => Promise<unknown>,
): Promise<void> {
  let prepared: T
  try {
    prepared = deepClone(entity)
    const now = isoNow()
    if (!prepared.createdAt) prepared.createdAt = now
    prepared.updatedAt = now
  } catch (cause) {
    throw wrapPersistenceError('serialization', operation, 'Failed to clone entity for save', cause)
  }

  const result = validate(prepared)
  if (!result.ok) {
    throw new PersistenceError('validation', operation, 'Entity failed validation', {
      details: result.errors,
    })
  }

  try {
    await put(result.value)
  } catch (cause) {
    if (cause instanceof PersistenceError) throw cause
    throw wrapPersistenceError('write', operation, 'Failed to write record', cause)
  }
}

export async function deleteById(
  operation: string,
  remove: () => Promise<unknown>,
): Promise<void> {
  try {
    await remove()
  } catch (cause) {
    throw wrapPersistenceError('write', operation, 'Failed to delete record', cause)
  }
}

export type { CivBrowserDatabase }
