import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapCanvas } from '../components/MapCanvas'
import { CitiesPanel } from '../components/activeGame/CitiesPanel'
import { CityPopup } from '../components/activeGame/CityPopup'
import { CivilizationsSummary } from '../components/activeGame/CivilizationsSummary'
import { EventsPanel } from '../components/activeGame/EventsPanel'
import { TilePopup } from '../components/activeGame/TilePopup'
import { WorldPanel } from '../components/activeGame/WorldPanel'
import { Badge, Button, EmptyState, SegmentedControl } from '../components/ui'
import {
  buildCityContext,
  buildTileContext,
  computeWorldMetrics,
  sanitizeSelection,
} from '../gameSession/contextSelectors'
import { resolveEventFocus, toEventDisplayItems } from '../gameSession/events'
import {
  isAtMaximumTurns,
  primaryPlayerSummary,
  resolveHumanCivilization,
  summarizeAllCivilizations,
  useActiveGameStore,
} from '../gameSession'
import { tileKey } from '../game/hexGrid'
import type { GameCity } from '../domain/gameSession'
import type { CivSummary } from '../gameSession/selectors'
import type { EventDisplayItem } from '../gameSession/events'

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`
}

function saveBadge(status: string): {
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  label: string
} {
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
  const width = useActiveGameStore((s) => s.width)
  const height = useActiveGameStore((s) => s.height)
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

  // Clear stale selection without dirtying the session
  useEffect(() => {
    const next = sanitizeSelection(selectedTileKey, tiles, cities)
    if (next !== selectedTileKey) selectTile(next)
  }, [tiles, cities, selectedTileKey, selectTile])

  const player = useMemo(
    () => primaryPlayerSummary(civilizations, cities),
    [civilizations, cities],
  )
  const human = useMemo(() => resolveHumanCivilization(civilizations), [civilizations])
  const civSummaries = useMemo(
    () => summarizeAllCivilizations(civilizations, cities),
    [civilizations, cities],
  )
  const eventItems = useMemo(() => toEventDisplayItems(events), [events])
  const worldMetrics = useMemo(
    () =>
      computeWorldMetrics({
        tiles,
        cities,
        civilizations,
        width,
        height,
        sourceMap,
        turn,
        currentYear,
        yearsPerTurn,
        maximumTurns,
        rules,
      }),
    [
      tiles,
      cities,
      civilizations,
      width,
      height,
      sourceMap,
      turn,
      currentYear,
      yearsPerTurn,
      maximumTurns,
      rules,
    ],
  )

  const atMax = isAtMaximumTurns(turn, maximumTurns)
  const saveMeta = saveBadge(
    dirty && saveStatus !== 'saving' && saveStatus !== 'error' ? 'idle' : saveStatus,
  )

  const tileContext = useMemo(
    () => (selectedTileKey ? buildTileContext(tiles, civilizations, selectedTileKey) : null),
    [selectedTileKey, tiles, civilizations],
  )

  const cityContext = useMemo(() => {
    if (!tileContext?.cityId) return null
    return buildCityContext(cities, civilizations, rules, tileContext.cityId, human?.id ?? null)
  }, [tileContext?.cityId, cities, civilizations, rules, human?.id])

  // Escape closes tile popup (city popup handles its own Escape when dialog closed)
  useEffect(() => {
    if (!tileContext || cityContext) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') selectTile(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tileContext, cityContext, selectTile])

  function selectAndFocusCity(city: GameCity) {
    selectTile(tileKey(city.coord))
    focusCoord(city.coord)
  }

  function onFocusEvent(item: EventDisplayItem) {
    const focus = resolveEventFocus(item, cities)
    if (!focus) return
    selectTile(focus.tileKey)
    focusCoord(focus.coord)
  }

  function onFocusCapital(summary: CivSummary) {
    if (summary.capitalCoord) {
      selectTile(tileKey(summary.capitalCoord))
      focusCoord(summary.capitalCoord)
    }
  }

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
                  Capital {player.summary.capitalName ?? '—'} · {player.summary.cityCount} cities ·
                  pop {player.summary.totalPopulation} · culture {player.summary.capitalCulture}
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

          {cityContext ? (
            <CityPopup context={cityContext} onClose={() => selectTile(null)} />
          ) : tileContext ? (
            <TilePopup context={tileContext} onClose={() => selectTile(null)} />
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
                  <EventsPanel items={eventItems} onFocusEvent={onFocusEvent} />
                </section>

                <section aria-labelledby="civs-heading">
                  <h3 id="civs-heading" className="active-game-section-title">
                    Civilizations
                  </h3>
                  <CivilizationsSummary
                    summaries={civSummaries}
                    cities={cities}
                    onFocusCapital={onFocusCapital}
                  />
                </section>
              </>
            ) : null}

            {panelTab === 'cities' ? (
              <CitiesPanel
                cities={cities}
                civilizations={civilizations}
                onSelectCity={selectAndFocusCity}
              />
            ) : null}

            {panelTab === 'world' ? (
              <WorldPanel metrics={worldMetrics} lastSavedAt={lastSavedAt} />
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
