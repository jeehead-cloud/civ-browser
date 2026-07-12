import { useEffect, useMemo, useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router-dom'
import { MapCanvas } from '../components/MapCanvas'
import { CitiesPanel } from '../components/activeGame/CitiesPanel'
import { CityPopup } from '../components/activeGame/CityPopup'
import { CivilizationsSummary } from '../components/activeGame/CivilizationsSummary'
import { DebugPanel } from '../components/activeGame/DebugPanel'
import { EventsPanel } from '../components/activeGame/EventsPanel'
import { TilePopup } from '../components/activeGame/TilePopup'
import { WorldPanel } from '../components/activeGame/WorldPanel'
import { Badge, Button, ConfirmDialog, EmptyState, SegmentedControl } from '../components/ui'
import {
  buildCityContext,
  buildTileContext,
  computeWorldMetrics,
  sanitizeSelection,
} from '../gameSession/contextSelectors'
import { resolveEventFocus, toEventDisplayItems } from '../gameSession/events'
import {
  isAtMaximumTurns,
  isDebugEditingAvailable,
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
  const debugAvailable = isDebugEditingAvailable()
  const [enableDebugOpen, setEnableDebugOpen] = useState(false)

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
  const debug = useActiveGameStore((s) => s.debug)

  const selectTile = useActiveGameStore((s) => s.selectTile)
  const setPanelTab = useActiveGameStore((s) => s.setPanelTab)
  const focusCoord = useActiveGameStore((s) => s.focusCoord)
  const endTurn = useActiveGameStore((s) => s.endTurn)
  const save = useActiveGameStore((s) => s.save)
  const clearRuntimeError = useActiveGameStore((s) => s.clearRuntimeError)
  const enableDebugEditing = useActiveGameStore((s) => s.enableDebugEditing)
  const disableDebugEditing = useActiveGameStore((s) => s.disableDebugEditing)
  const setDebugInteractionMode = useActiveGameStore((s) => s.setDebugInteractionMode)
  const setDebugTool = useActiveGameStore((s) => s.setDebugTool)
  const setDebugTerrain = useActiveGameStore((s) => s.setDebugTerrain)
  const setDebugFeature = useActiveGameStore((s) => s.setDebugFeature)
  const setDebugResource = useActiveGameStore((s) => s.setDebugResource)
  const setDebugElevationAction = useActiveGameStore((s) => s.setDebugElevationAction)
  const applyDebugEditAt = useActiveGameStore((s) => s.applyDebugEditAt)

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

  // Unsaved leave protection (debug edits and turn advances)
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const blocker = useBlocker(dirty)

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

  const debugEditActive = debug.enabled && debug.interactionMode === 'edit'
  const showPopups = !debugEditActive

  const tileContext = useMemo(
    () =>
      showPopups && selectedTileKey
        ? buildTileContext(tiles, civilizations, selectedTileKey)
        : null,
    [showPopups, selectedTileKey, tiles, civilizations],
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
    <div
      className={
        debug.enabled ? 'active-game-shell active-game-shell--debug' : 'active-game-shell'
      }
    >
      <header className="active-game-topbar" aria-label="Civilization status">
        <div className="active-game-topbar__left">
          <Link to="/" className="ui-button ui-button--ghost ui-button--sm">
            Menu
          </Link>
          <span className="active-game-topbar__title">{name}</span>
          {sourceMap ? (
            <span className="active-game-topbar__muted">{sourceMap.templateName}</span>
          ) : null}
          {debug.enabled ? (
            <Badge tone="warning">
              {debug.interactionMode === 'edit' ? 'Debug Edit' : 'Debug Inspect'}
            </Badge>
          ) : (
            <Badge tone="neutral">Play / View</Badge>
          )}
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
          {debugAvailable && !debug.enabled ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setEnableDebugOpen(true)}
            >
              Debug Mode
            </Button>
          ) : null}
        </div>
      </header>

      {debug.enabled ? (
        <div className="active-game-debug-banner" role="status" aria-live="polite">
          <strong>Debug Editing Active</strong>
          <span>
            Only this game session is being edited. Source map templates and presets remain
            unchanged.
          </span>
        </div>
      ) : null}

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
              selectedTileKey: showPopups ? selectedTileKey : null,
              focusRequest: cameraFocus,
              onSelectTile: (key) => selectTile(key),
              debugEdit: debugEditActive
                ? {
                    editMode: true,
                    tool: debug.tool,
                    onEditTile: (key, edge) => {
                      applyDebugEditAt(key, edge)
                    },
                  }
                : undefined,
            }}
          />

          {showPopups && cityContext ? (
            <CityPopup context={cityContext} onClose={() => selectTile(null)} />
          ) : showPopups && tileContext ? (
            <TilePopup context={tileContext} onClose={() => selectTile(null)} />
          ) : null}

          {debug.enabled ? (
            <div className="active-game-debug-dock">
              <DebugPanel
                interactionMode={debug.interactionMode}
                tool={debug.tool}
                settings={debug.settings}
                lastEditMessage={debug.lastEditMessage}
                pendingChangedTileCount={debug.pendingChangedTileCount}
                saveBusy={saveStatus === 'saving' || turnBusy}
                onModeChange={setDebugInteractionMode}
                onToolChange={setDebugTool}
                onTerrainChange={setDebugTerrain}
                onFeatureChange={setDebugFeature}
                onResourceChange={setDebugResource}
                onElevationActionChange={setDebugElevationAction}
                onSave={() => void save()}
                onDisable={disableDebugEditing}
              />
            </div>
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
                      : dirty
                        ? 'Saves unsaved changes, then advances one turn'
                        : 'Advance one turn'
              }
              onClick={() => void endTurn()}
            >
              {turnBusy ? 'Processing…' : 'Next Turn'}
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={enableDebugOpen}
        title="Enable Debug Editing?"
        message="This edits the current game session only and may change simulation results. Source map templates, civilization templates, and rules presets remain unchanged. Changes persist only when you save the session. This is a development tool."
        confirmLabel="Enable Debug Editing"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          const result = enableDebugEditing()
          setEnableDebugOpen(false)
          if (!result.ok && result.error) {
            useActiveGameStore.setState({ runtimeError: result.error })
          }
        }}
        onCancel={() => setEnableDebugOpen(false)}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Unsaved changes"
        message="This session has unsaved changes (including any debug edits). Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  )
}
