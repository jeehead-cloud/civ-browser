import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

export function ActiveGamePage() {
  const { gameId } = useParams()

  return (
    <AppShell title="Active Game">
      <h1 style={{ marginTop: 0 }}>Active Game</h1>
      <p>This is the Active Game screen.</p>
      <p style={{ color: '#475569' }}>
        Implementation belongs to foundation milestones <strong>F10</strong>–<strong>F11</strong>. No game session is
        loaded or persisted here.
      </p>
      <p>
        Requested route context — game ID: <code>{gameId}</code>
      </p>
      <p>
        <Link to="/">← Main Menu</Link>
        {' · '}
        <Link to="/games/new">New Game</Link>
      </p>
    </AppShell>
  )
}
