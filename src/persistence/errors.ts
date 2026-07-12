export type PersistenceErrorCode =
  | 'database_open'
  | 'validation'
  | 'serialization'
  | 'write'
  | 'read'
  | 'migration'

/**
 * Typed persistence failure for repository / database callers.
 * Normal not-found remains `null` from get() — not an error.
 */
export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode
  readonly operation: string
  readonly details?: string[]
  readonly cause?: unknown

  constructor(
    code: PersistenceErrorCode,
    operation: string,
    message: string,
    options?: { cause?: unknown; details?: string[] },
  ) {
    super(message)
    this.name = 'PersistenceError'
    this.code = code
    this.operation = operation
    this.cause = options?.cause
    this.details = options?.details
  }
}

export function isPersistenceError(error: unknown): error is PersistenceError {
  return error instanceof PersistenceError
}

export function wrapPersistenceError(
  code: PersistenceErrorCode,
  operation: string,
  fallbackMessage: string,
  cause: unknown,
  details?: string[],
): PersistenceError {
  if (cause instanceof PersistenceError) return cause
  const message =
    cause instanceof Error && cause.message ? `${fallbackMessage}: ${cause.message}` : fallbackMessage
  return new PersistenceError(code, operation, message, { cause, details })
}
