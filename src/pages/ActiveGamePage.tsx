import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge, Button, EmptyState, PageHeader, Panel } from '../components/ui'
import type { GameSession } from '../domain/gameSession'
import { getGameSession } from '../newGame/newGameService'
import { catalogErrorMessage } from '../catalog/persistence'

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'

export function ActiveGamePage() {
  const { gameId } = useParams()
  const [status, setStatus] = useState<LoadState>('loading')
  const [session, setSession] = useState<GameSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!gameId) {
        setStatus('not-found')
        return
      }
      setStatus('loading')
      setError(null)
      try {
        const loaded = await getGameSession(gameId)
        if (cancelled) return
        if (!loaded) {
          setSession(null)
          setStatus('not-found')
          return
        }
        setSession(loaded)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setError(catalogErrorMessage(err, 'Failed to load game session'))
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gameId])

  return (
    <AppShell title="Active Game">
      <PageHeader
        eyebrow="Session"
        title={session?.name ?? 'Active Game'}
        description="Persisted session summary — full gameplay shell arrives in F10."
      />

      {status === 'loading' ? (
        <p style={{ color: 'var(--text-tertiary)' }}>Loading game session…</p>
      ) : null}

      {status === 'error' ? (
        <EmptyState
          title="Could not load session"
          actions={
            <Link to="/games/new" className="ui-button ui-button--secondary ui-button--md">
              New Game
            </Link>
          }
        >
          <p style={{ margin: 0 }}>{error}</p>
        </EmptyState>
      ) : null}

      {status === 'not-found' ? (
        <EmptyState
          title="Game not found"
          milestone="F9"
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
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            gameId = {gameId ?? '(missing)'}
          </p>
        </EmptyState>
      ) : null}

      {status === 'ready' && session ? (
        <>
          <div className="catalog-banner" role="status">
            Full Active Game UI is deferred to F10. This page confirms the session was created and
            persisted.
          </div>
          <Panel
            title="Session summary"
            actions={<Badge tone="warning">F10 pending</Badge>}
          >
            <dl className="wizard-dl">
              <div>
                <dt>Game ID</dt>
                <dd style={{ fontFamily: 'var(--font-mono)' }}>{session.id}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{session.name}</dd>
              </div>
              <div>
                <dt>Map</dt>
                <dd>
                  {session.sourceMap?.templateName ?? 'Unknown source'}
                  {session.sourceMap
                    ? ` (${session.width}×${session.height})`
                    : ` (${session.width}×${session.height})`}
                </dd>
              </div>
              <div>
                <dt>Turn / Year</dt>
                <dd>
                  Turn {session.turn} · Year {session.currentYear} · {session.yearsPerTurn} years/turn
                  {session.maximumTurns != null ? ` · max ${session.maximumTurns} turns` : ''}
                </dd>
              </div>
              <div>
                <dt>Civilizations</dt>
                <dd>
                  <ul className="wizard-capitals">
                    {session.civilizations.map((civ) => {
                      const capital = session.cities.find((c) => c.id === civ.capitalCityId)
                      return (
                        <li key={civ.id}>
                          {civ.flagEmoji} {civ.name} ({civ.playerType})
                          {capital ? ` — capital ${capital.name}` : ''}
                        </li>
                      )
                    })}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Rules snapshot</dt>
                <dd>
                  growth {session.rules.settings.baseGrowthRate}, culture{' '}
                  {session.rules.settings.capitalCulturePerTurn}/turn, annex{' '}
                  {session.rules.settings.cultureAnnexThreshold}
                  {session.rules.sourcePresetId
                    ? ` (from preset ${session.rules.sourcePresetId})`
                    : ''}
                </dd>
              </div>
            </dl>
          </Panel>
          <div className="wizard-footer">
            <Link to="/games/new" className="ui-button ui-button--secondary ui-button--md">
              New Game
            </Link>
            <Link to="/" className="ui-button ui-button--ghost ui-button--md">
              Main Menu
            </Link>
            <Button variant="ghost" size="md" type="button" disabled title="F10">
              Play (F10)
            </Button>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
