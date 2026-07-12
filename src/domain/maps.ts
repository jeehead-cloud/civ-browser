import type { AxialCoord, Tile } from '../game/types'

/** Reusable city placed on a map before a game starts (no owner / culture / growth). */
export interface MapCityTemplate {
  id: string
  name: string
  coord: AxialCoord
  /** Population at game start when this city is instantiated into a session. */
  startingPopulation: number
}

/**
 * Reusable editable map content (catalog / World Editor source).
 * Must not hold turn, year, civilization progress, or other session-only state.
 *
 * Tile geometry reuses the legacy `Tile` shape. Template tiles should keep
 * `ownerCivId` null; `cityId` may reference a `MapCityTemplate.id` for placement.
 */
export interface MapTemplate {
  id: string
  name: string
  description: string
  version: number
  width: number
  height: number
  tiles: Record<string, Tile>
  cities: MapCityTemplate[]
  createdAt: string
  updatedAt: string
}
