import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

export function CivilizationsCatalogPage() {
  return (
    <AppShell title="Civilizations">
      <h1 style={{ marginTop: 0 }}>Civilizations</h1>
      <p>This is the Civilizations catalog screen.</p>
      <p style={{ color: '#475569' }}>
        Implementation belongs to foundation milestone <strong>F4</strong>. Reusable civilization templates and a
        dedicated catalog are not implemented yet. Civilizations can still be managed inside the current World Editor.
      </p>
      <p>
        <Link to="/library">← Back to Library</Link>
        {' · '}
        <Link to="/library/maps/current/edit">Open Current World Editor</Link>
      </p>
    </AppShell>
  )
}
