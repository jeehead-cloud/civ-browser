import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge, EmptyState, PageHeader } from '../components/ui'

export function CivilizationsCatalogPage() {
  return (
    <AppShell title="Civilizations">
      <PageHeader
        eyebrow="Library / Civilizations"
        title="Civilizations Catalog"
        description="Reusable civilization templates (name, culture, flag, color) will be managed here."
      />
      <EmptyState
        title="Catalog not implemented"
        milestone="F4 Content Library"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <Link to="/library/maps/current/edit" className="ui-button ui-button--secondary ui-button--md">
              Manage Civs in World Editor
            </Link>
            <Link to="/library" className="ui-button ui-button--ghost ui-button--md">
              Back to Library
            </Link>
          </div>
        }
      >
        <p style={{ margin: '0 0 var(--space-3)' }}>
          Until F4, civilizations can still be created and assigned capitals inside the current World Editor sidebar.
        </p>
        <Badge tone="warning">Placeholder</Badge>
      </EmptyState>
    </AppShell>
  )
}
