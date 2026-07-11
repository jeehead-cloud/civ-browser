import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

export function NewGamePage() {
  return (
    <AppShell title="New Game">
      <h1 style={{ marginTop: 0 }}>New Game</h1>
      <p>This is the New Game setup screen.</p>
      <p style={{ color: '#475569' }}>
        Implementation belongs to foundation milestone <strong>F9</strong> (New Game Wizard). No game session is created
        from this placeholder.
      </p>
      <p>
        <Link to="/">← Main Menu</Link>
        {' · '}
        <Link to="/library">Game Content Library</Link>
      </p>
    </AppShell>
  )
}
