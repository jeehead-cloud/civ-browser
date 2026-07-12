import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge, EmptyState, PageHeader } from '../components/ui'

export function ActiveGamePage() {
  const { gameId } = useParams()

  return (
    <AppShell title="Active Game">
      <PageHeader
        eyebrow="Session"
        title="Active Game"
        description="Dedicated gameplay shell with map, status bar, and turn controls."
      />
      <EmptyState
        title="Session shell not implemented"
        milestone="F10–F11"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <Link to="/games/new" className="ui-button ui-button--secondary ui-button--md">
              New Game
            </Link>
            <Link to="/" className="ui-button ui-button--ghost ui-button--md">
              Main Menu
            </Link>
          </div>
        }
      >
        <p style={{ margin: '0 0 var(--space-3)' }}>
          No game session is loaded or persisted here. Route context only:
        </p>
        <p style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          gameId = {gameId}
        </p>
        <Badge tone="warning">Placeholder</Badge>
      </EmptyState>
    </AppShell>
  )
}
