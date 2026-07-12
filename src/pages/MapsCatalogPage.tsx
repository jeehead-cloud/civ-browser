import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge, EmptyState, PageHeader } from '../components/ui'

export function MapsCatalogPage() {
  return (
    <AppShell title="Maps">
      <PageHeader
        eyebrow="Library / Maps"
        title="Maps Catalog"
        description="Reusable map templates will live here: create, open, duplicate, import, export, delete."
      />
      <EmptyState
        title="Catalog not implemented"
        milestone="F4 Content Library"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <Link to="/library/maps/current/edit" className="ui-button ui-button--primary ui-button--md">
              Open Current World Editor
            </Link>
            <Link to="/library" className="ui-button ui-button--secondary ui-button--md">
              Back to Library
            </Link>
          </div>
        }
      >
        <p style={{ margin: '0 0 var(--space-3)' }}>
          This screen is a placeholder. Map templates and catalog actions arrive in foundation milestone F4; per-map editor
          routes arrive in F5.
        </p>
        <Badge tone="warning">Placeholder</Badge>
      </EmptyState>
    </AppShell>
  )
}
