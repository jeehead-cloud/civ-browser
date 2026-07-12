import type { GameSessionEvent, GameSessionEventType } from '../domain/gameSession'
import type { CivilizationInstance } from '../domain/civilizations'
import type { GameCity } from '../domain/gameSession'
import { tileKey } from '../game/hexGrid'

export interface EventDisplayItem {
  id: string
  turn: number
  year: number
  type: string
  message: string
  icon: string
  relatedCityIds: string[]
  relatedCivilizationIds: string[]
  /** Tile key to select/center when clicking, if resolvable. */
  focusCityId: string | null
}

const KNOWN_TYPES = new Set<GameSessionEventType>([
  'growth_summary',
  'culture_generated',
  'annexation',
  'turn_completed',
  'debug_edit_saved',
])

function iconFor(type: string): string {
  if (type === 'annexation') return '🏛'
  if (type === 'growth_summary') return '📈'
  if (type === 'culture_generated') return '🎭'
  if (type === 'turn_completed') return '⏭'
  if (type === 'debug_edit_saved') return '🛠'
  return '•'
}

/** Normalize missing/unknown events for safe UI rendering. */
export function normalizeEvents(events: GameSessionEvent[] | null | undefined): GameSessionEvent[] {
  if (!events || !Array.isArray(events)) return []
  return events.filter((e) => e && typeof e === 'object' && typeof e.id === 'string')
}

export function toEventDisplayItems(
  events: GameSessionEvent[] | null | undefined,
): EventDisplayItem[] {
  const list = normalizeEvents(events)
  const newestFirst = [...list].reverse()
  return newestFirst.map((evt) => {
    const type = typeof evt.type === 'string' ? evt.type : 'unknown'
    const known = KNOWN_TYPES.has(type as GameSessionEventType)
    return {
      id: evt.id,
      turn: Number.isFinite(evt.turn) ? evt.turn : 0,
      year: Number.isFinite(evt.year) ? evt.year : 0,
      type: known ? type : 'unknown',
      message:
        typeof evt.message === 'string' && evt.message.trim()
          ? evt.message
          : known
            ? type
            : `Unknown event (${type})`,
      icon: iconFor(known ? type : 'unknown'),
      relatedCityIds: Array.isArray(evt.relatedCityIds) ? evt.relatedCityIds : [],
      relatedCivilizationIds: Array.isArray(evt.relatedCivilizationIds)
        ? evt.relatedCivilizationIds
        : [],
      focusCityId:
        Array.isArray(evt.relatedCityIds) && evt.relatedCityIds[0]
          ? evt.relatedCityIds[0]
          : typeof evt.data?.annexedCityId === 'string'
            ? evt.data.annexedCityId
            : typeof evt.data?.capitalCityId === 'string'
              ? evt.data.capitalCityId
              : null,
    }
  })
}

export function resolveEventFocus(
  item: EventDisplayItem,
  cities: GameCity[],
): { tileKey: string; coord: { q: number; r: number } } | null {
  if (!item.focusCityId) return null
  const city = cities.find((c) => c.id === item.focusCityId)
  if (!city) return null
  return { tileKey: tileKey(city.coord), coord: { ...city.coord } }
}

export function resolveCivLabel(
  civId: string | null | undefined,
  civilizations: CivilizationInstance[],
): string | null {
  if (!civId) return null
  return civilizations.find((c) => c.id === civId)?.name ?? null
}
