import { Link } from 'react-router-dom'
import { MapCanvas } from '../components/MapCanvas'
import { Toolbar } from '../components/Toolbar'
import { CityModal } from '../components/CityModal'
import { TileInfoPanel } from '../components/TileInfoPanel'
import { CivilizationsPanel } from '../components/CivilizationsPanel'
import { SettingsPanel } from '../components/SettingsPanel'
import { PlayControlPanel } from '../components/PlayControlPanel'
import { PlayersPanel } from '../components/PlayersPanel'

/** Existing MVP World Editor — tools/panels unchanged; chrome strip only uses Atlas tokens. */
export function WorldEditorPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'var(--font-sans)' }}>
      <div className="world-editor-chrome">
        <Link to="/">← Main Menu</Link>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <span>Current World Editor · temporary until map catalog (F4/F5)</span>
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0, background: '#f8fafc', color: '#111' }}>
        <Toolbar />
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Civ Browser — World Builder (MVP)</h2>
          <MapCanvas />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <CivilizationsPanel />
          <PlayControlPanel />
          <PlayersPanel />
          <SettingsPanel />
        </div>
      </div>
      <CityModal />
      <TileInfoPanel />
    </div>
  )
}
