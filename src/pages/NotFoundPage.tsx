import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

export function NotFoundPage() {
  return (
    <AppShell title="Not found">
      <h1 style={{ marginTop: 0 }}>Page not found</h1>
      <p style={{ color: '#475569' }}>This URL does not match any Civ Browser screen.</p>
      <p>
        <Link to="/">← Back to Main Menu</Link>
      </p>
    </AppShell>
  )
}
