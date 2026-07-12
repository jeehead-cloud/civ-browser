import { Tile } from '../types'

export type ResourceDensity = 'sparse' | 'standard' | 'rich'

export interface LayerOpResult {
  ok: boolean
  changed: boolean
  tilesChanged: number
  message: string
  warnings: string[]
  /** Present when tiles were modified. Caller must not mutate further without cloning. */
  tiles?: Record<string, Tile>
  meta?: Record<string, number | string>
}

export interface LayerMapContext {
  width: number
  height: number
  seed?: number
}

export function emptyResult(message: string, warnings: string[] = []): LayerOpResult {
  return { ok: true, changed: false, tilesChanged: 0, message, warnings }
}

export function failResult(message: string): LayerOpResult {
  return { ok: false, changed: false, tilesChanged: 0, message, warnings: [] }
}

export function successResult(
  tiles: Record<string, Tile>,
  tilesChanged: number,
  message: string,
  warnings: string[] = [],
  meta?: Record<string, number | string>,
): LayerOpResult {
  return {
    ok: true,
    changed: tilesChanged > 0,
    tilesChanged,
    message,
    warnings,
    tiles: tilesChanged > 0 ? tiles : undefined,
    meta,
  }
}
