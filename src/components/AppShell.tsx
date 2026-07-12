import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

interface AppShellProps {
  title?: string
  children: ReactNode
}

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <Link to="/" className="app-shell__brand">
            Civ Browser
          </Link>
          {title ? <div className="app-shell__subtitle">{title}</div> : null}
        </div>
        <nav className="app-shell__nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => `app-shell__nav-link${isActive ? ' app-shell__nav-link--active' : ''}`}>
            Main Menu
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => `app-shell__nav-link${isActive ? ' app-shell__nav-link--active' : ''}`}>
            Library
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `app-shell__nav-link${isActive ? ' app-shell__nav-link--active' : ''}`}>
            Settings
          </NavLink>
          <NavLink
            to="/library/maps/current/edit"
            className={({ isActive }) => `app-shell__nav-link${isActive ? ' app-shell__nav-link--active' : ''}`}
          >
            World Editor
          </NavLink>
        </nav>
      </header>
      <main className="app-shell__main">{children}</main>
    </div>
  )
}
