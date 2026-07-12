import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge, Button, CardLink, EmptyState, PageHeader, SectionHeader } from '../components/ui'
import { getMostRecentGameSession } from '../gameSession'
import { catalogErrorMessage } from '../catalog/persistence'

export function MainMenuPage() {
  const navigate = useNavigate()
  const [hasSessions, setHasSessions] = useState<boolean | null>(null)
  const [continueError, setContinueError] = useState<string | null>(null)
  const [continueBusy, setContinueBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const recent = await getMostRecentGameSession()
        if (!cancelled) setHasSessions(Boolean(recent))
      } catch {
        if (!cancelled) setHasSessions(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const continueGame = useCallback(async () => {
    setContinueBusy(true)
    setContinueError(null)
    try {
      const recent = await getMostRecentGameSession()
      if (!recent) {
        setHasSessions(false)
        setContinueError('No saved games yet. Start a New Game first.')
        return
      }
      navigate(`/games/${recent.id}`)
    } catch (err) {
      setContinueError(catalogErrorMessage(err, 'Could not open the latest game'))
    } finally {
      setContinueBusy(false)
    }
  }, [navigate])

  return (
    <AppShell title="Main Menu">
      <PageHeader
        eyebrow="Civ Browser"
        title="Command Deck"
        description="Build maps, define civilizations, and step through turns. The Atlas shell keeps the world readable while chrome stays quiet."
      />

      <SectionHeader title="Primary Actions" />
      <div className="stack" style={{ marginBottom: 'var(--space-9)' }}>
        <Button
          variant="secondary"
          size="lg"
          block
          disabled={hasSessions === false || continueBusy}
          title={
            hasSessions === false
              ? 'No saved game sessions'
              : 'Open the most recently updated game'
          }
          onClick={() => void continueGame()}
        >
          {continueBusy ? 'Opening…' : 'Continue Game'}
        </Button>
        {hasSessions === false ? (
          <EmptyState title="No saved sessions" milestone="F10">
            Create a game from New Game, then Continue opens the most recent session.
          </EmptyState>
        ) : null}
        {continueError ? (
          <div className="catalog-status-error" role="alert">
            {continueError}
          </div>
        ) : null}
        <Link to="/games/new" className="ui-button ui-button--primary ui-button--lg ui-button--block">
          New Game
        </Link>
        <Link to="/library" className="ui-button ui-button--secondary ui-button--lg ui-button--block">
          Game Content Library
        </Link>
        <Link to="/settings" className="ui-button ui-button--secondary ui-button--lg ui-button--block">
          Settings &amp; Balance
        </Link>
      </div>

      <SectionHeader title="Development Entry" action={<Badge tone="warning">Temporary</Badge>} />
      <CardLink to="/library/maps/current/edit">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div>
            <strong style={{ fontFamily: 'var(--font-sans)' }}>Open Current World Editor</strong>
            <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-size-sm)' }}>
              Scratch editor for map tooling. Catalog maps open from the Maps library.
            </p>
          </div>
          <Badge tone="info">Dev</Badge>
        </div>
      </CardLink>
    </AppShell>
  )
}
