import { Link } from 'react-router-dom'
import { MapCanvas } from '../components/MapCanvas'
import { Toolbar } from '../components/Toolbar'
import { CityModal } from '../components/CityModal'
import { TileInfoPanel } from '../components/TileInfoPanel'
import { CivilizationsPanel } from '../components/CivilizationsPanel'
import { SettingsPanel } from '../components/SettingsPanel'
import { PlayControlPanel } from '../components/PlayControlPanel'
import { PlayersPanel } from '../components/PlayersPanel'

/** Existing MVP World Editor mounted unchanged under /library/maps/current/edit */
export function WorldEditorPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      <div
        style={{
          flex: '0 0 auto',
          padding: '4px 12px',
          fontSize: 12,
          background: '#0f172a',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link to="/" style={{ color: '#93c5fd', textDecoration: 'none' }}>
          ← Main Menu
        </Link>
        <span style={{ color: '#64748b' }}>|</span>
        <span>Current World Editor (temporary route until map catalog — F4/F5)</span>
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Toolbar />
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <h2>Civ Browser — World Builder (MVP)</h2>
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
