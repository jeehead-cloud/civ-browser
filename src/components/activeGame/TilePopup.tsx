import { Button } from '../ui'
import type { TileContextView } from '../../gameSession/contextSelectors'

function formatOwner(ctx: TileContextView): string {
  if (ctx.owner.kind === 'civilization' && ctx.owner.name) {
    return `${ctx.owner.flagEmoji ?? ''} ${ctx.owner.name}`.trim()
  }
  if (ctx.owner.kind === 'unknown') return 'Unknown owner'
  return 'Neutral / unclaimed'
}

interface TilePopupProps {
  context: TileContextView
  onClose: () => void
}

/** Contextual tile info — map-edge overlay (anchor-follow deferred). */
export function TilePopup({ context, onClose }: TilePopupProps) {
  return (
    <aside
      className="active-context-popup"
      role="dialog"
      aria-modal="false"
      aria-label="Tile information"
    >
      <div className="active-context-popup__header">
        <div>
          <h3 className="active-context-popup__title">Tile</h3>
          <p className="active-context-popup__coords">
            ({context.coord.q}, {context.coord.r})
          </p>
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={onClose} aria-label="Close tile popup">
          Close
        </Button>
      </div>

      <section className="active-context-popup__section">
        <h4>Landscape</h4>
        <dl className="active-context-popup__dl">
          <div>
            <dt>Terrain</dt>
            <dd>{context.terrain}</dd>
          </div>
          <div>
            <dt>Feature</dt>
            <dd>{context.feature === 'none' ? 'none' : context.feature}</dd>
          </div>
          <div>
            <dt>Relief</dt>
            <dd>
              {context.isMountains
                ? 'mountains'
                : context.hasHills
                  ? 'hills'
                  : 'flat'}
            </dd>
          </div>
          <div>
            <dt>Resource</dt>
            <dd>{context.resource === 'none' ? 'none' : context.resource}</dd>
          </div>
        </dl>
      </section>

      <section className="active-context-popup__section">
        <h4>Water</h4>
        <dl className="active-context-popup__dl">
          <div>
            <dt>River on tile</dt>
            <dd>{context.water.riverOnTile ? 'yes' : 'no'}</dd>
          </div>
          <div>
            <dt>River nearby</dt>
            <dd>{context.water.riverNearby ? 'yes' : 'no'}</dd>
          </div>
          <div>
            <dt>Adjacent lake</dt>
            <dd>{context.water.adjacentLake ? 'yes' : 'no'}</dd>
          </div>
          <div>
            <dt>Fresh water</dt>
            <dd>
              <strong>{context.water.freshWater ? 'yes' : 'no'}</strong>
            </dd>
          </div>
        </dl>
      </section>

      <section className="active-context-popup__section">
        <h4>Yield</h4>
        <p className="active-context-popup__hint">{context.yields.label} · display only</p>
        <dl className="active-context-popup__dl">
          <div>
            <dt>Food</dt>
            <dd>{context.yields.workable ? context.yields.food : '—'}</dd>
          </div>
          <div>
            <dt>Production</dt>
            <dd>{context.yields.workable ? context.yields.production : '—'}</dd>
          </div>
          <div>
            <dt>Beauty</dt>
            <dd>Planned</dd>
          </div>
        </dl>
        {!context.yields.workable ? (
          <p className="active-context-popup__hint">Mountains provide no workable yield.</p>
        ) : null}
      </section>

      <section className="active-context-popup__section">
        <h4>Ownership</h4>
        <p style={{ margin: 0 }}>{formatOwner(context)}</p>
      </section>
    </aside>
  )
}
