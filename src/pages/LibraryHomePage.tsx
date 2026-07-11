import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { AppShell } from '../components/AppShell'

const linkCardStyle: CSSProperties = {
  display: 'block',
  padding: '14px 16px',
  marginBottom: 10,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#fff',
  textDecoration: 'none',
  color: '#111',
}

export function LibraryHomePage() {
  return (
    <AppShell title="Game Content Library">
      <h1 style={{ marginTop: 0 }}>Game Content Library</h1>
      <p style={{ color: '#475569' }}>
        Reusable content catalog. Only Maps and Civilizations are active in this foundation stage.
      </p>

      <Link to="/library/maps" style={linkCardStyle}>
        <strong>Maps</strong>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Map templates catalog (placeholder)</div>
      </Link>
      <Link to="/library/civilizations" style={linkCardStyle}>
        <strong>Civilizations</strong>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Civilization templates catalog (placeholder)</div>
      </Link>

      <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 24 }}>
        Planned later: Technologies, Units, Buildings, Great People, Actions, Scenarios — no routes yet.
      </p>
    </AppShell>
  )
}
