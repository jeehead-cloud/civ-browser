import { useGameStore } from '../game/store'
import { TerrainType, ResourceType } from '../game/types'

const TERRAINS: TerrainType[] = [
  'ocean',
  'coast',
  'plains',
  'grassland',
  'hills',
  'mountains',
  'desert',
  'tundra',
  'snow',
]

const RESOURCES: ResourceType[] = ['none', 'iron', 'horses', 'gold', 'gems', 'wheat', 'fish']

const BRUSH_SIZES = [0, 1, 2, 3, 5, 8]

export function Toolbar() {
  const builder = useGameStore((s) => s.builder)
  const setSelectedTerrain = useGameStore((s) => s.setSelectedTerrain)
  const setSelectedResource = useGameStore((s) => s.setSelectedResource)
  const setMode = useGameStore((s) => s.setMode)
  const setBrushRadius = useGameStore((s) => s.setBrushRadius)
  const regenerateMap = useGameStore((s) => s.regenerateMap)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, width: 240 }}>
      <div>
        <h3>Режим</h3>
        <button
          style={{ fontWeight: builder.mode === 'terrain' ? 'bold' : 'normal' }}
          onClick={() => setMode('terrain')}
        >
          Ландшафт
        </button>{' '}
        <button
          style={{ fontWeight: builder.mode === 'resource' ? 'bold' : 'normal' }}
          onClick={() => setMode('resource')}
        >
          Ресурс
        </button>{' '}
        <button
          style={{ fontWeight: builder.mode === 'city' ? 'bold' : 'normal' }}
          onClick={() => setMode('city')}
        >
          Город
        </button>
      </div>

      <div>
        <h4>Размер кисти</h4>
        <select
          value={builder.brushRadius}
          onChange={(e) => setBrushRadius(Number(e.target.value))}
        >
          {BRUSH_SIZES.map((size) => (
            <option key={size} value={size}>
              {size === 0 ? '1 гекс' : `радиус ${size}`}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: '#666' }}>
          Для города всегда красится только 1 центральный гекс.
        </p>
      </div>

      {builder.mode === 'terrain' && (
        <div>
          <h4>Тип ландшафта</h4>
          {TERRAINS.map((t) => (
            <div key={t}>
              <label>
                <input
                  type="radio"
                  name="terrain"
                  checked={builder.selectedTerrain === t}
                  onChange={() => setSelectedTerrain(t)}
                />
                {t}
              </label>
            </div>
          ))}
        </div>
      )}

      {builder.mode === 'resource' && (
        <div>
          <h4>Ресурс</h4>
          {RESOURCES.map((r) => (
            <div key={r}>
              <label>
                <input
                  type="radio"
                  name="resource"
                  checked={builder.selectedResource === r}
                  onChange={() => setSelectedResource(r)}
                />
                {r}
              </label>
            </div>
          ))}
        </div>
      )}

      {builder.mode === 'city' && (
        <p style={{ fontSize: 13, color: '#555' }}>
          Кликни по гексу, чтобы поставить/убрать город.
        </p>
      )}

      <div>
        <h4>Процедурная база</h4>
        <button onClick={() => regenerateMap()}>Сгенерировать заново</button>
        <p style={{ fontSize: 12, color: '#666' }}>
          Перегенерирует всю карту случайным континентом — используй как
          отправную точку, дальше правь кистью вручную.
        </p>
      </div>
    </div>
  )
}
