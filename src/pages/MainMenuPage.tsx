import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge, Button, CardLink, EmptyState, PageHeader, SectionHeader } from '../components/ui'

export function MainMenuPage() {
  const [continueNote, setContinueNote] = useState(false)

  return (
    <AppShell title="Main Menu">
      <PageHeader
        eyebrow="Civ Browser"
        title="Command Deck"
        description="Build maps, define civilizations, and step through turns. The Atlas shell keeps the world readable while chrome stays quiet."
      />

      <SectionHeader title="Primary Actions" />
      <div className="stack" style={{ marginBottom: 'var(--space-9)' }}>
        <Button variant="secondary" size="lg" block onClick={() => setContinueNote(true)}>
          Continue Game
        </Button>
        {continueNote && (
          <EmptyState title="No saved sessions" milestone="F3 / F9 / F10">
            Saved game sessions will appear here after local persistence and the New Game wizard exist. There is nothing to resume yet.
          </EmptyState>
        )}
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
              Existing MVP editor until maps become catalog items (F4 / F5).
            </p>
          </div>
          <Badge tone="info">F1 Bridge</Badge>
        </div>
      </CardLink>
    </AppShell>
  )
}
