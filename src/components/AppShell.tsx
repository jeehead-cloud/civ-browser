import { Link } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'

const shellStyle: CSSProperties = {
  minHeight: '100vh',
  fontFamily: 'sans-serif',
  background: '#f8fafc',
  color: '#111',
  display: 'flex',
  flexDirection: 'column',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '12px 20px',
  borderBottom: '1px solid #e2e8f0',
  background: '#fff',
}

const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: '24px 20px',
  maxWidth: 720,
  width: '100%',
  margin: '0 auto',
  boxSizing: 'border-box',
}

interface AppShellProps {
  title?: string
  children: ReactNode
}

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <Link to="/" style={{ color: '#111', textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>
            Civ Browser
          </Link>
          {title ? (
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{title}</div>
          ) : null}
        </div>
        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 14 }}>
          <Link to="/">Main Menu</Link>
          <Link to="/library">Library</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/library/maps/current/edit">World Editor</Link>
        </nav>
      </header>
      <main style={mainStyle}>{children}</main>
    </div>
  )
}
