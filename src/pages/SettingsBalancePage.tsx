import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge, EmptyState, PageHeader } from '../components/ui'

export function SettingsBalancePage() {
  return (
    <AppShell title="Settings & Balance">
      <PageHeader
        eyebrow="Settings"
        title="Settings & Balance"
        description="Rules presets and editable balance parameters will live here with category navigation."
      />
      <EmptyState
        title="Presets not implemented"
        milestone="F8 Rules Presets"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <Link to="/library/maps/current/edit" className="ui-button ui-button--secondary ui-button--md">
              Edit Current Global Settings
            </Link>
            <Link to="/" className="ui-button ui-button--ghost ui-button--md">
              Main Menu
            </Link>
          </div>
        }
      >
        <p style={{ margin: '0 0 var(--space-3)' }}>
          Growth rate, capital culture, and annex threshold remain editable in the World Editor settings panel until
          presets exist.
        </p>
        <Badge tone="warning">Placeholder</Badge>
      </EmptyState>
    </AppShell>
  )
}
