import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge, EmptyState, PageHeader } from '../components/ui'

export function NewGamePage() {
  return (
    <AppShell title="New Game">
      <PageHeader
        eyebrow="Setup"
        title="New Game"
        description="Four-step wizard: Map → Civilizations → Game Settings → Review & Start."
      />
      <EmptyState
        title="Wizard not implemented"
        milestone="F9 New Game Wizard"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <Link to="/library" className="ui-button ui-button--secondary ui-button--md">
              Game Content Library
            </Link>
            <Link to="/" className="ui-button ui-button--ghost ui-button--md">
              Main Menu
            </Link>
          </div>
        }
      >
        <p style={{ margin: '0 0 var(--space-3)' }}>
          No game session is created from this screen. Session creation requires templates and persistence (F2–F4, F9).
        </p>
        <Badge tone="warning">Placeholder</Badge>
      </EmptyState>
    </AppShell>
  )
}
