import { AppShell } from '../components/AppShell'
import { Badge, CardLink, PageHeader, SectionHeader } from '../components/ui'

export function LibraryHomePage() {
  return (
    <AppShell title="Game Content Library">
      <PageHeader
        eyebrow="Library"
        title="Game Content Library"
        description="Reusable templates for maps and civilizations. Only these two categories are active in the foundation stage."
      />

      <SectionHeader title="Active Categories" />
      <div className="stack">
        <CardLink to="/library/maps">
          <strong>Maps</strong>
          <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-size-sm)' }}>
            Create, import, duplicate, export, and open map templates in the temporary editor bridge
          </p>
        </CardLink>
        <CardLink to="/library/civilizations">
          <strong>Civilizations</strong>
          <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-size-sm)' }}>
            Create and edit reusable civilization templates (name, culture, flag, color)
          </p>
        </CardLink>
      </div>

      <div style={{ marginTop: 'var(--space-8)' }}>
        <SectionHeader title="Planned" action={<Badge tone="neutral">Later</Badge>} />
        <p style={{ color: 'var(--text-disabled)', fontSize: 'var(--text-size-sm)', margin: 0 }}>
          Technologies · Units · Buildings · Great People · Actions · Scenarios — no routes yet.
        </p>
      </div>
    </AppShell>
  )
}
