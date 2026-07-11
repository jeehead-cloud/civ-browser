import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

export function SettingsBalancePage() {
  return (
    <AppShell title="Settings & Balance">
      <h1 style={{ marginTop: 0 }}>Settings &amp; Balance</h1>
      <p>This is the Settings &amp; Balance screen.</p>
      <p style={{ color: '#475569' }}>
        Implementation belongs to foundation milestone <strong>F8</strong> (Rules Presets). Global growth/culture
        parameters can still be edited in the current World Editor sidebar.
      </p>
      <p>
        <Link to="/">← Main Menu</Link>
        {' · '}
        <Link to="/library/maps/current/edit">Open Current World Editor</Link>
      </p>
    </AppShell>
  )
}
