import { EmptyState } from '../ui'
import type { EventDisplayItem } from '../../gameSession/events'

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`
}

interface EventsPanelProps {
  items: EventDisplayItem[]
  onFocusEvent: (item: EventDisplayItem) => void
}

export function EventsPanel({ items, onFocusEvent }: EventsPanelProps) {
  if (items.length === 0) {
    return (
      <EmptyState title="No events yet">
        <p style={{ margin: 0 }}>End a turn to begin the session log.</p>
      </EmptyState>
    )
  }

  return (
    <ul className="active-game-events" aria-live="polite" aria-label="Game events">
      {items.map((evt) => (
        <li key={evt.id}>
          <button
            type="button"
            className="active-game-events__item active-game-events__btn"
            onClick={() => onFocusEvent(evt)}
            title={evt.focusCityId ? 'Center on related city' : 'No map target'}
          >
            <span className="active-game-events__meta">
              <span aria-hidden="true">{evt.icon}</span> T{evt.turn} · {formatYear(evt.year)} ·{' '}
              {evt.type}
            </span>
            <span>{evt.message}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
