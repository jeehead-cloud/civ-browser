import { MapCanvas } from './components/MapCanvas'
import { Toolbar } from './components/Toolbar'

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <Toolbar />
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <h2>Civ Browser — World Builder (MVP)</h2>
        <MapCanvas />
      </div>
    </div>
  )
}
