import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

export function MapsCatalogPage() {
  return (
    <AppShell title="Maps">
      <h1 style={{ marginTop: 0 }}>Maps</h1>
      <p>This is the Maps catalog screen.</p>
      <p style={{ color: '#475569' }}>
        Implementation belongs to foundation milestone <strong>F4</strong> (Game Content Library). Map templates are not
        stored as catalog items yet.
      </p>
      <p>
        Until then, use the temporary entry:{' '}
        <Link to="/library/maps/current/edit">Open Current World Editor</Link>
      </p>
      <p>
        <Link to="/library">← Back to Library</Link>
      </p>
    </AppShell>
  )
}
