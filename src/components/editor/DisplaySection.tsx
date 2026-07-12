import {
  EditorDisplayLayers,
  EditorDisplayPreset,
} from '../../editor/displayLayers'
import { useGameStore } from '../../game/store'
import { Button } from '../ui'
import { PlannedHint } from './EditorCommandBar'

const LAYER_LABELS: { key: keyof EditorDisplayLayers; label: string }[] = [
  { key: 'grid', label: 'Grid' },
  { key: 'terrain', label: 'Terrain' },
  { key: 'features', label: 'Features' },
  { key: 'mountainsHills', label: 'Mountains / Hills' },
  { key: 'rivers', label: 'Rivers' },
  { key: 'resources', label: 'Resources' },
  { key: 'cities', label: 'Cities' },
  { key: 'ownershipFlags', label: 'Civ flags' },
]

const PRESETS: { value: EditorDisplayPreset; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'terrainOnly', label: 'Terrain' },
  { value: 'resourcesOnly', label: 'Resources' },
  { value: 'citiesOnly', label: 'Cities' },
  { value: 'relief', label: 'Relief' },
]

export function DisplaySection() {
  const editorDisplay = useGameStore((s) => s.editorDisplay)
  const setEditorDisplayLayer = useGameStore((s) => s.setEditorDisplayLayer)
  const applyEditorDisplayPreset = useGameStore((s) => s.applyEditorDisplayPreset)

  return (
    <div className="world-editor-display">
      <p className="world-editor-field__hint">
        Display layers affect rendering only. They do not change map data or dirty state.
      </p>

      <div className="world-editor-field">
        <span className="world-editor-field__label">Presets</span>
        <div className="world-editor-chip-grid">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className="world-editor-chip"
              onClick={() => applyEditorDisplayPreset(p.value)}
            >
              {p.label}
            </button>
          ))}
          <button type="button" className="world-editor-chip" disabled title="Planned">
            Political
          </button>
        </div>
      </div>

      <ul className="world-editor-layer-list" aria-label="Display layers">
        {LAYER_LABELS.map(({ key, label }) => (
          <li key={key}>
            <label className="world-editor-layer-toggle">
              <input
                type="checkbox"
                checked={editorDisplay[key]}
                onChange={(e) => setEditorDisplayLayer(key, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          </li>
        ))}
      </ul>

      <PlannedHint>Planned layers: improvements · roads · labels · full political overlay</PlannedHint>
      <div className="world-editor-inline-actions">
        <Button variant="ghost" size="sm" disabled title="Planned">
          Improvements
        </Button>
        <Button variant="ghost" size="sm" disabled title="Planned">
          Roads
        </Button>
        <Button variant="ghost" size="sm" disabled title="Planned">
          Labels
        </Button>
      </div>
    </div>
  )
}
