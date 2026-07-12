import { useEffect, useId, useState } from 'react'
import { Badge, Button, Dialog } from '../ui'
import type { CityContextView } from '../../gameSession/contextSelectors'

interface CityPopupProps {
  context: CityContextView
  onClose: () => void
}

/** Contextual city info — map-edge overlay; actions are planned/disabled. */
export function CityPopup({ context, onClose }: CityPopupProps) {
  const titleId = useId()
  const [actionsOpen, setActionsOpen] = useState(false)
  const { city, owner } = context

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !actionsOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, actionsOpen])

  return (
    <aside
      className="active-context-popup active-context-popup--city"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <div className="active-context-popup__header">
        <div className="active-context-popup__city-head">
          <span className="active-context-popup__emblem" aria-hidden="true">
            {owner.flagEmoji ?? '🏙'}
          </span>
          <div>
            <h3 id={titleId} className="active-context-popup__title">
              {city.name}{' '}
              {city.isCapital ? <Badge tone="warning">Capital</Badge> : null}
            </h3>
            <p className="active-context-popup__coords">
              ({city.coord.q}, {city.coord.r}) · founded Unknown
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={onClose} aria-label="Close city popup">
          Close
        </Button>
      </div>

      <section className="active-context-popup__section">
        <h4>Owner</h4>
        {owner.kind === 'civilization' && owner.name ? (
          <p style={{ margin: 0 }}>
            {owner.flagEmoji} {owner.name}{' '}
            <Badge tone={owner.playerType === 'human' ? 'success' : 'neutral'}>
              {owner.playerType}
            </Badge>
          </p>
        ) : (
          <p style={{ margin: 0 }}>Unclaimed</p>
        )}
      </section>

      <section className="active-context-popup__section">
        <h4>Parameters</h4>
        <dl className="active-context-popup__dl">
          <div>
            <dt>Population</dt>
            <dd>{city.population}</dd>
          </div>
          <div>
            <dt>Culture</dt>
            <dd>{city.culture}</dd>
          </div>
          <div>
            <dt>Growth / turn</dt>
            <dd>
              {(context.growthRate * 100).toFixed(2)}%
              <span className="active-context-popup__hint">
                {' '}
                (base {(context.baseGrowthRate * 100).toFixed(2)}% + bonus{' '}
                {(city.growthRateBonus * 100).toFixed(2)}%)
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="active-context-popup__section">
        <h4>Characters</h4>
        <p className="active-context-popup__hint">Characters — planned</p>
      </section>

      <section className="active-context-popup__section">
        <h4>Buildings</h4>
        <p className="active-context-popup__hint">Buildings — not implemented</p>
      </section>

      <section className="active-context-popup__section">
        <h4>Planned metrics</h4>
        <p className="active-context-popup__hint">
          Production, science, and mood are planned — not shown as real values.
        </p>
      </section>

      <div className="active-context-popup__actions">
        {context.isHumanOwned ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled
              title={context.actions.build.reason}
            >
              Build
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setActionsOpen(true)}
            >
              Actions
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setActionsOpen(true)}
          >
            Actions
          </Button>
        )}
        <p className="active-context-popup__hint" id="city-action-reason">
          {context.actions.generic.reason}
        </p>
      </div>

      <Dialog
        open={actionsOpen}
        title="City actions"
        onClose={() => setActionsOpen(false)}
        footer={
          <Button variant="secondary" size="md" type="button" onClick={() => setActionsOpen(false)}>
            Close
          </Button>
        }
      >
        <p style={{ margin: '0 0 var(--space-3)' }}>
          These actions are planned and do not change the game yet:
        </p>
        <ul className="active-context-planned-list">
          <li>Build — production / buildings (unavailable)</li>
          <li>Embassy — planned</li>
          <li>Trade — planned</li>
          <li>Espionage — planned</li>
        </ul>
      </Dialog>
    </aside>
  )
}
