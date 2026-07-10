import { MapCanvas } from './components/MapCanvas'
import { Toolbar } from './components/Toolbar'
import { CityModal } from './components/CityModal'
import { TileInfoPanel } from './components/TileInfoPanel'
import { CivilizationsPanel } from './components/CivilizationsPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { PlayControlPanel } from './components/PlayControlPanel'
import { PlayersPanel } from './components/PlayersPanel'

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <Toolbar />
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <h2>Civ Browser — World Builder (MVP)</h2>
        <MapCanvas />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <CivilizationsPanel />
        <PlayControlPanel />
        <PlayersPanel />
        <SettingsPanel />
      </div>
      <CityModal />
      <TileInfoPanel />
    </div>
  )
}
