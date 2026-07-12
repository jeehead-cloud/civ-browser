import { useState } from 'react'
import { Badge } from '../ui'
import type { CivSummary } from '../../gameSession/selectors'
import type { GameCity } from '../../domain/gameSession'

interface CivilizationsSummaryProps {
  summaries: CivSummary[]
  cities: GameCity[]
  onFocusCapital: (summary: CivSummary) => void
}

export function CivilizationsSummary({
  summaries,
  cities,
  onFocusCapital,
}: CivilizationsSummaryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <ul className="active-game-civ-list">
      {summaries.map((civ) => {
        const expanded = expandedId === civ.id
        const owned = cities.filter((c) => c.civId === civ.id)
        return (
          <li key={civ.id}>
            <button
              type="button"
              className="active-game-civ-btn"
              aria-expanded={expanded}
              onClick={() => {
                onFocusCapital(civ)
                setExpandedId(expanded ? null : civ.id)
              }}
              title={
                civ.capitalCoord ? `Center on ${civ.capitalName}` : 'No capital to center'
              }
            >
              <span aria-hidden="true">{civ.flagEmoji}</span>
              <span className="active-game-civ-btn__body">
                <strong>
                  {civ.name}{' '}
                  <Badge tone={civ.playerType === 'human' ? 'success' : 'neutral'}>
                    {civ.playerType}
                  </Badge>
                </strong>
                <span className="active-game-muted">
                  Cap {civ.capitalName ?? '—'} · {civ.cityCount} cities · pop{' '}
                  {civ.totalPopulation} · culture {civ.capitalCulture}
                </span>
              </span>
            </button>
            {expanded ? (
              <div className="active-civ-detail" role="region" aria-label={`${civ.name} details`}>
                <p className="active-game-muted" style={{ marginTop: 0 }}>
                  Owned cities ({owned.length})
                </p>
                <ul className="active-civ-detail__cities">
                  {owned.map((c) => (
                    <li key={c.id}>
                      {c.name}
                      {c.isCapital ? ' 👑' : ''} · pop {c.population} · culture {c.culture}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
