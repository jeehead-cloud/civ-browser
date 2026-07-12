/** Explicit conversion / validation result. Prefer over thrown errors for adapters. */
export type ConversionResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] }

export function ok<T>(value: T): ConversionResult<T> {
  return { ok: true, value }
}

export function fail<T = never>(errors: string | string[]): ConversionResult<T> {
  return { ok: false, errors: Array.isArray(errors) ? errors : [errors] }
}
