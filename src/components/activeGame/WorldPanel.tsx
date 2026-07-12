import type { WorldMetrics } from '../../gameSession/contextSelectors'

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`
}

interface WorldPanelProps {
  metrics: WorldMetrics
  lastSavedAt: string | null
}

function formatSavedAt(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function WorldPanel({ metrics, lastSavedAt }: WorldPanelProps) {
  const terrainEntries = Object.entries(metrics.terrainCounts).sort((a, b) => b[1] - a[1])

  return (
    <section>
      <h3 className="active-game-section-title">World</h3>
      <dl className="active-context-popup__dl">
        <div>
          <dt>Map</dt>
          <dd>
            {metrics.mapName} ({metrics.width}×{metrics.height})
          </dd>
        </div>
        <div>
          <dt>Land / water</dt>
          <dd>
            {metrics.landTiles} / {metrics.waterTiles}
          </dd>
        </div>
        <div>
          <dt>Cities</dt>
          <dd>
            {metrics.cityCount} ({metrics.claimedCities} claimed, {metrics.unclaimedCities} free)
          </dd>
        </div>
        <div>
          <dt>Civilizations</dt>
          <dd>{metrics.civilizationCount}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            {formatYear(metrics.currentYear)} · turn {metrics.turn}
            {metrics.maximumTurns != null ? ` / ${metrics.maximumTurns}` : ''} ·{' '}
            {metrics.yearsPerTurn} yr/turn
          </dd>
        </div>
        <div>
          <dt>Rules</dt>
          <dd>{metrics.rulesSummary ?? '—'}</dd>
        </div>
        <div>
          <dt>River tiles</dt>
          <dd>{metrics.riverEdgeTiles}</dd>
        </div>
        <div>
          <dt>Resource tiles</dt>
          <dd>{metrics.resourceTiles}</dd>
        </div>
        <div>
          <dt>Last saved</dt>
          <dd>{formatSavedAt(lastSavedAt)}</dd>
        </div>
      </dl>

      <h4 className="active-game-section-title" style={{ marginTop: 'var(--space-4)' }}>
        Terrain counts
      </h4>
      <ul className="active-world-terrain">
        {terrainEntries.map(([terrain, count]) => (
          <li key={terrain}>
            <span>{terrain}</span>
            <span>{count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
