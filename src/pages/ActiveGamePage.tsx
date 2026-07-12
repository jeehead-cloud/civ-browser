import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapCanvas } from '../components/MapCanvas'
import {
  Badge,
  Button,
  EmptyState,
  SegmentedControl,
} from '../components/ui'
import {
  eventsNewestFirst,
  isAtMaximumTurns,
  primaryPlayerSummary,
  summarizeAllCivilizations,
  useActiveGameStore,
} from '../gameSession'

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`
}

function formatSavedAt(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function saveBadge(status: string): { tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; label: string } {
  if (status === 'saving') return { tone: 'info', label: 'Saving…' }
  if (status === 'saved') return { tone: 'success', label: 'Saved' }
  if (status === 'error') return { tone: 'danger', label: 'Save error' }
  return { tone: 'neutral', label: 'Unsaved' }
}

export function ActiveGamePage() {
  const { gameId } = useParams()
  const loadStatus = useActiveGameStore((s) => s.loadStatus)
  const loadError = useActiveGameStore((s) => s.loadError)
  const loadSession = useActiveGameStore((s) => s.loadSession)
  const reset = useActiveGameStore((s) => s.reset)

  const name = useActiveGameStore((s) => s.name)
  const tiles = useActiveGameStore((s) => s.tiles)
  const cities = useActiveGameStore((s) => s.cities)
  const civilizations = useActiveGameStore((s) => s.civilizations)
  const rules = useActiveGameStore((s) => s.rules)
  const turn = useActiveGameStore((s) => s.turn)
  const currentYear = useActiveGameStore((s) => s.currentYear)
  const yearsPerTurn = useActiveGameStore((s) => s.yearsPerTurn)
  const maximumTurns = useActiveGameStore((s) => s.maximumTurns)
  const events = useActiveGameStore((s) => s.events)
  const selectedTileKey = useActiveGameStore((s) => s.selectedTileKey)
  const cameraFocus = useActiveGameStore((s) => s.cameraFocus)
  const panelTab = useActiveGameStore((s) => s.panelTab)
  const saveStatus = useActiveGameStore((s) => s.saveStatus)
  const lastSavedAt = useActiveGameStore((s) => s.lastSavedAt)
  const saveError = useActiveGameStore((s) => s.saveError)
  const turnBusy = useActiveGameStore((s) => s.turnBusy)
  const runtimeError = useActiveGameStore((s) => s.runtimeError)
  const dirty = useActiveGameStore((s) => s.dirty)
  const sourceMap = useActiveGameStore((s) => s.sourceMap)

  const selectTile = useActiveGameStore((s) => s.selectTile)
  const setPanelTab = useActiveGameStore((s) => s.setPanelTab)
  const focusCoord = useActiveGameStore((s) => s.focusCoord)
  const endTurn = useActiveGameStore((s) => s.endTurn)
  const save = useActiveGameStore((s) => s.save)
  const clearRuntimeError = useActiveGameStore((s) => s.clearRuntimeError)

  useEffect(() => {
    if (!gameId) return
    void loadSession(gameId)
    return () => {
      reset()
    }
  }, [gameId, loadSession, reset])

  const player = useMemo(
    () => primaryPlayerSummary(civilizations, cities),
    [civilizations, cities],
  )
  const civSummaries = useMemo(
    () => summarizeAllCivilizations(civilizations, cities),
    [civilizations, cities],
  )
  const recentEvents = useMemo(() => eventsNewestFirst(events).slice(0, 40), [events])
  const atMax = isAtMaximumTurns(turn, maximumTurns)
  const saveMeta = saveBadge(dirty && saveStatus !== 'saving' && saveStatus !== 'error' ? 'idle' : saveStatus)

  const selectedTile = selectedTileKey ? tiles[selectedTileKey] : null
  const selectedCity = selectedTile?.cityId
    ? cities.find((c) => c.id === selectedTile.cityId) ?? null
    : null
  const selectedCiv = selectedCity?.civId
    ? civilizations.find((c) => c.id === selectedCity.civId) ?? null
    : null

  if (loadStatus === 'loading' || loadStatus === 'idle') {
    return (
      <div className="active-game-shell">
        <p className="active-game-loading" role="status">
          Loading game session…
        </p>
      </div>
    )
  }

  if (loadStatus === 'not-found') {
    return (
      <div className="active-game-shell active-game-shell--message">
        <EmptyState
          title="Game not found"
          milestone="F10"
          actions={
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <Link to="/games/new" className="ui-button ui-button--primary ui-button--md">
                New Game
              </Link>
              <Link to="/" className="ui-button ui-button--ghost ui-button--md">
                Main Menu
              </Link>
            </div>
          }
        >
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>gameId = {gameId}</p>
        </EmptyState>
      </div>
    )
  }

  if (loadStatus === 'error') {
    return (
      <div className="active-game-shell active-game-shell--message">
        <EmptyState
          title="Could not load session"
          actions={
            <Button variant="secondary" size="md" onClick={() => gameId && void loadSession(gameId)}>
              Retry
            </Button>
          }
        >
          <p style={{ margin: 0 }}>{loadError}</p>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="active-game-shell">
      <header className="active-game-topbar" aria-label="Civilization status">
        <div className="active-game-topbar__left">
          <Link to="/" className="ui-button ui-button--ghost ui-button--sm">
            Menu
          </Link>
          <span className="active-game-topbar__title">{name}</span>
          {sourceMap ? (
            <span className="active-game-topbar__muted">{sourceMap.templateName}</span>
          ) : null}
        </div>

        <div className="active-game-topbar__center">
          {player.ok ? (
            <>
              <span className="active-game-topbar__flag" aria-hidden="true">
                {player.summary.flagEmoji}
              </span>
              <div>
                <strong>{player.summary.name}</strong>
                <div className="active-game-topbar__muted">
                  Capital {player.summary.capitalName ?? '—'} · {player.summary.cityCount} cities · pop{' '}
                  {player.summary.totalPopulation} · culture {player.summary.capitalCulture}
                </div>
              </div>
            </>
          ) : (
            <div className="active-game-topbar__error" role="alert">
              {player.error}
            </div>
          )}
        </div>

        <div className="active-game-topbar__right">
          <div className="active-game-topbar__time">
            <strong>{formatYear(currentYear)}</strong>
            <span className="active-game-topbar__muted">
              Turn {turn}
              {maximumTurns != null ? ` / ${maximumTurns}` : ''} · {yearsPerTurn} yr/turn
            </span>
          </div>
          <Badge tone={saveMeta.tone}>{saveMeta.label}</Badge>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            disabled={turnBusy || saveStatus === 'saving'}
            onClick={() => void save()}
          >
            Save Game
          </Button>
        </div>
      </header>

      {(runtimeError || saveError) && (
        <div className="active-game-banner" role="alert">
          {runtimeError ?? saveError}
          <div className="active-game-banner__actions">
            {runtimeError ? (
              <Button variant="ghost" size="sm" type="button" onClick={() => clearRuntimeError()}>
                Dismiss
              </Button>
            ) : null}
            {saveError ? (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={saveStatus === 'saving'}
                onClick={() => void save()}
              >
                Retry Save
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <div className="active-game-body">
        <div className="active-game-map-column">
          <MapCanvas
            view={{
              tiles,
              cities,
              civilizations,
              selectedTileKey,
              focusRequest: cameraFocus,
              onSelectTile: (key) => selectTile(key),
            }}
          />

          {selectedTile ? (
            <aside className="active-game-selection" aria-label="Selected tile">
              <div className="active-game-selection__header">
                <strong>
                  Hex ({selectedTile.coord.q}, {selectedTile.coord.r})
                  {selectedCity ? ` · ${selectedCity.name}` : ''}
                </strong>
                <Button variant="ghost" size="sm" type="button" onClick={() => selectTile(null)}>
                  Close
                </Button>
              </div>
              <dl className="active-game-selection__dl">
                <div>
                  <dt>Terrain</dt>
                  <dd>{selectedTile.terrain}</dd>
                </div>
                <div>
                  <dt>Feature</dt>
                  <dd>{selectedTile.vegetation}</dd>
                </div>
                <div>
                  <dt>Hills</dt>
                  <dd>{selectedTile.hasHills ? 'yes' : 'no'}</dd>
                </div>
                <div>
                  <dt>Resource</dt>
                  <dd>{selectedTile.resource}</dd>
                </div>
                <div>
                  <dt>River</dt>
                  <dd>{selectedTile.riverDirections.length > 0 ? 'yes' : 'no'}</dd>
                </div>
                {selectedCity ? (
                  <>
                    <div>
                      <dt>City</dt>
                      <dd>
                        {selectedCity.name}
                        {selectedCity.isCapital ? ' (capital)' : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>
                        {selectedCiv
                          ? `${selectedCiv.flagEmoji} ${selectedCiv.name}`
                          : 'Unclaimed'}
                      </dd>
                    </div>
                    <div>
                      <dt>Population</dt>
                      <dd>{selectedCity.population}</dd>
                    </div>
                    <div>
                      <dt>Culture</dt>
                      <dd>{selectedCity.culture}</dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>Owner</dt>
                    <dd>{selectedTile.ownerCivId ?? 'none'}</dd>
                  </div>
                )}
              </dl>
            </aside>
          ) : null}
        </div>

        <aside className="active-game-right" aria-label="Game information">
          <div className="active-game-right__tabs">
            <SegmentedControl
              ariaLabel="Information panels"
              size="sm"
              value={panelTab}
              onChange={(v) => setPanelTab(v as 'overview' | 'cities' | 'world')}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'cities', label: 'Cities' },
                { value: 'world', label: 'World' },
              ]}
            />
          </div>

          <div className="active-game-right__body">
            {panelTab === 'overview' ? (
              <>
                <section aria-labelledby="events-heading">
                  <h3 id="events-heading" className="active-game-section-title">
                    Notifications &amp; Events
                  </h3>
                  {recentEvents.length === 0 ? (
                    <p className="active-game-muted">No events yet. End a turn to begin the log.</p>
                  ) : (
                    <ul className="active-game-events" aria-live="polite">
                      {recentEvents.map((evt) => (
                        <li key={evt.id} className="active-game-events__item">
                          <span className="active-game-events__meta">
                            T{evt.turn} · {formatYear(evt.year)} · {evt.type}
                          </span>
                          <span>{evt.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="civs-heading">
                  <h3 id="civs-heading" className="active-game-section-title">
                    Civilizations
                  </h3>
                  <ul className="active-game-civ-list">
                    {civSummaries.map((civ) => (
                      <li key={civ.id}>
                        <button
                          type="button"
                          className="active-game-civ-btn"
                          onClick={() => {
                            if (civ.capitalCoord) focusCoord(civ.capitalCoord)
                          }}
                          title={
                            civ.capitalCoord
                              ? `Center on ${civ.capitalName}`
                              : 'No capital to center'
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
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}

            {panelTab === 'cities' ? (
              <section>
                <h3 className="active-game-section-title">Cities</h3>
                <p className="active-game-muted">
                  Read-only list for F10. Full city actions arrive in F11.
                </p>
                <ul className="active-game-city-list">
                  {cities.map((city) => {
                    const civ = city.civId
                      ? civilizations.find((c) => c.id === city.civId)
                      : null
                    return (
                      <li key={city.id}>
                        <button
                          type="button"
                          className="active-game-civ-btn"
                          onClick={() => {
                            const key = `${city.coord.q},${city.coord.r}`
                            selectTile(key)
                            focusCoord(city.coord)
                          }}
                        >
                          <span>
                            {city.name}
                            {city.isCapital ? ' 👑' : ''} · pop {city.population} ·{' '}
                            {civ ? `${civ.flagEmoji} ${civ.name}` : 'Unclaimed'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            {panelTab === 'world' ? (
              <section>
                <h3 className="active-game-section-title">World</h3>
                <dl className="active-game-selection__dl">
                  <div>
                    <dt>Map</dt>
                    <dd>{sourceMap?.templateName ?? 'Session map'}</dd>
                  </div>
                  <div>
                    <dt>Rules</dt>
                    <dd>
                      {rules
                        ? `growth ${rules.settings.baseGrowthRate}, culture ${rules.settings.capitalCulturePerTurn}/turn, annex ${rules.settings.cultureAnnexThreshold}`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Last saved</dt>
                    <dd>{formatSavedAt(lastSavedAt)}</dd>
                  </div>
                </dl>
                <p className="active-game-muted">World diplomacy and fog of war are deferred.</p>
              </section>
            ) : null}
          </div>

          <div className="active-game-right__footer">
            <div className="active-game-turn-meta" aria-live="polite">
              <strong>{formatYear(currentYear)}</strong>
              <span>
                Turn {turn}
                {maximumTurns != null ? ` / ${maximumTurns}` : ''}
              </span>
              {atMax ? (
                <span className="active-game-topbar__error">Maximum turns reached</span>
              ) : null}
            </div>
            <Button
              variant="primary"
              size="lg"
              type="button"
              block
              disabled={turnBusy || saveStatus === 'saving' || atMax || !player.ok}
              title={
                atMax
                  ? 'Maximum turns reached'
                  : !player.ok
                    ? player.error
                    : turnBusy
                      ? 'Processing turn…'
                      : 'Advance one turn'
              }
              onClick={() => void endTurn()}
            >
              {turnBusy ? 'Processing…' : 'Next Turn'}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
