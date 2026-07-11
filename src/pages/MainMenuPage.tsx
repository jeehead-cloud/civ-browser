import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

const actionButtonStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '14px 16px',
  marginBottom: 10,
  fontSize: 16,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  color: '#111',
  textDecoration: 'none',
  boxSizing: 'border-box',
}

export function MainMenuPage() {
  const [continueNote, setContinueNote] = useState(false)

  return (
    <AppShell title="Main Menu">
      <h1 style={{ marginTop: 0 }}>Civ Browser</h1>
      <p style={{ color: '#475569', marginBottom: 24 }}>
        Browser-based Civilization-inspired sandbox. Build maps, define civilizations, and step through turns.
      </p>

      <div style={{ marginBottom: 28 }}>
        <button type="button" style={actionButtonStyle} onClick={() => setContinueNote(true)}>
          Continue Game
        </button>
        {continueNote && (
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', padding: '8px 12px', background: '#f1f5f9', borderRadius: 4 }}>
            Saved game sessions will be available in a later foundation milestone (F3 / F9 / F10). There is nothing to resume yet.
          </p>
        )}
        <Link to="/games/new" style={actionButtonStyle}>
          New Game
        </Link>
        <Link to="/library" style={actionButtonStyle}>
          Game Content Library
        </Link>
        <Link to="/settings" style={actionButtonStyle}>
          Settings &amp; Balance
        </Link>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
        <h3 style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Temporary development entry</h3>
        <Link
          to="/library/maps/current/edit"
          style={{ ...actionButtonStyle, borderStyle: 'dashed', background: '#f8fafc' }}
        >
          Open Current World Editor
        </Link>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          Opens the existing MVP editor until maps become catalog items (F4 / F5).
        </p>
      </div>
    </AppShell>
  )
}
