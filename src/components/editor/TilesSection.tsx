import { useGameStore } from '../../game/store'
import { TerrainType } from '../../game/types'
import { Accordion, Button, SegmentedControl } from '../ui'
import { PlannedHint } from './EditorCommandBar'

const TERRAINS: TerrainType[] = [
  'ocean',
  'coast',
  'lake',
  'plains',
  'grassland',
  'mountains',
  'desert',
  'tundra',
  'snow',
]

const BRUSH_SIZES = [0, 1, 2, 3, 5, 8]

interface TilesSectionProps {
  openSection: string | null
  onToggleSection: (id: string) => void
  editEnabled: boolean
}

export function TilesSection({ openSection, onToggleSection, editEnabled }: TilesSectionProps) {
  const builder = useGameStore((s) => s.builder)
  const setSelectedTerrain = useGameStore((s) => s.setSelectedTerrain)
  const setSelectedResource = useGameStore((s) => s.setSelectedResource)
  const setSelectedVegetation = useGameStore((s) => s.setSelectedVegetation)
  const setMode = useGameStore((s) => s.setMode)
  const setBrushRadius = useGameStore((s) => s.setBrushRadius)
  const regenerateMap = useGameStore((s) => s.regenerateMap)
  const generateEarthMap = useGameStore((s) => s.generateEarthMap)

  const disabled = !editEnabled

  return (
    <div className="world-editor-tiles">
      <div className={`world-editor-tool-context${disabled ? ' is-disabled' : ''}`}>
        <div className="world-editor-field">
          <span className="world-editor-field__label">Brush radius</span>
          <SegmentedControl
            ariaLabel="Brush radius"
            size="sm"
            value={String(builder.brushRadius)}
            onChange={(v) => !disabled && setBrushRadius(Number(v))}
            options={BRUSH_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
          />
        </div>
        <p className="world-editor-tool-context__active">
          Active tool: <strong>{builder.mode}</strong>
          {builder.mode === 'terrain' ? ` · ${builder.selectedTerrain}` : null}
          {builder.mode === 'vegetation' ? ` · ${builder.selectedVegetation}` : null}
          {builder.mode === 'resource' ? ` · ${builder.selectedResource}` : null}
        </p>
        {disabled ? <p className="world-editor-tool-context__note">Switch to Edit mode to paint.</p> : null}
      </div>

      <Accordion
        title="Terrain"
        open={openSection === 'terrain'}
        onToggle={() => onToggleSection('terrain')}
      >
        <div className="world-editor-chip-grid">
          {TERRAINS.map((t) => (
            <button
              key={t}
              type="button"
              className={`world-editor-chip${builder.mode === 'terrain' && builder.selectedTerrain === t ? ' is-active' : ''}`}
              disabled={disabled}
              onClick={() => setSelectedTerrain(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="world-editor-inline-actions">
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => regenerateMap()}>
            Random procedural
          </Button>
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => generateEarthMap()}>
            Earth-like
          </Button>
        </div>
      </Accordion>

      <Accordion
        title="Features"
        open={openSection === 'features'}
        onToggle={() => onToggleSection('features')}
      >
        <p className="world-editor-field__hint">Vegetation model (forest / jungle / swamp).</p>
        <div className="world-editor-chip-grid">
          {(['none', 'forest', 'jungle', 'swamp'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`world-editor-chip${builder.mode === 'vegetation' && builder.selectedVegetation === v ? ' is-active' : ''}`}
              disabled={disabled}
              onClick={() => setSelectedVegetation(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </Accordion>

      <Accordion
        title="Mountains and Hills"
        open={openSection === 'hills'}
        onToggle={() => onToggleSection('hills')}
      >
        <Button
          variant={builder.mode === 'hills' ? 'primary' : 'secondary'}
          size="sm"
          disabled={disabled}
          onClick={() => setMode('hills')}
        >
          Toggle hills brush
        </Button>
        <p className="world-editor-field__hint">Paint mountains via Terrain → mountains.</p>
        <PlannedHint>Planned (F7): Clear All · Random Small Mountain Area · Random Mountain Chain</PlannedHint>
        <div className="world-editor-inline-actions">
          <Button variant="ghost" size="sm" disabled title="Planned for F7">
            Clear All
          </Button>
          <Button variant="ghost" size="sm" disabled title="Planned for F7">
            Random Small Area
          </Button>
          <Button variant="ghost" size="sm" disabled title="Planned for F7">
            Random Chain
          </Button>
        </div>
      </Accordion>

      <Accordion
        title="Rivers"
        open={openSection === 'rivers'}
        onToggle={() => onToggleSection('rivers')}
      >
        <Button
          variant={builder.mode === 'river' ? 'primary' : 'secondary'}
          size="sm"
          disabled={disabled}
          onClick={() => setMode('river')}
        >
          Edit river edges
        </Button>
        <p className="world-editor-field__hint">Click near a hex edge to add/remove a river segment.</p>
        <PlannedHint>Planned (F7): Clear All Rivers · Random Short River · Random Long River</PlannedHint>
        <div className="world-editor-inline-actions">
          <Button variant="ghost" size="sm" disabled title="Planned for F7">
            Clear All Rivers
          </Button>
          <Button variant="ghost" size="sm" disabled title="Planned for F7">
            Random Short
          </Button>
          <Button variant="ghost" size="sm" disabled title="Planned for F7">
            Random Long
          </Button>
        </div>
      </Accordion>

      <Accordion
        title="Resources"
        open={openSection === 'resources'}
        onToggle={() => onToggleSection('resources')}
      >
        <div className="world-editor-chip-grid world-editor-chip-grid--dense">
          {(
            [
              'none',
              'wheat',
              'deer',
              'fish',
              'bananas',
              'stone',
              'gold',
              'silver',
              'gems',
              'iron',
              'horses',
              'coal',
              'oil',
            ] as const
          ).map((r) => (
            <button
              key={r}
              type="button"
              className={`world-editor-chip${builder.mode === 'resource' && builder.selectedResource === r ? ' is-active' : ''}`}
              disabled={disabled}
              onClick={() => setSelectedResource(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <PlannedHint>Planned: quantity · randomize · clear all</PlannedHint>
        <div className="world-editor-inline-actions">
          <Button variant="ghost" size="sm" disabled title="Planned">
            Quantity
          </Button>
          <Button variant="ghost" size="sm" disabled title="Planned">
            Randomize
          </Button>
          <Button variant="ghost" size="sm" disabled title="Planned">
            Clear All
          </Button>
        </div>
      </Accordion>

      <Accordion
        title="Improvements"
        open={openSection === 'improvements'}
        onToggle={() => onToggleSection('improvements')}
        badge="Planned"
      >
        <PlannedHint>No improvement model in F6. Controls disabled.</PlannedHint>
        <Button variant="ghost" size="sm" disabled>
          Place improvement
        </Button>
      </Accordion>

      <Accordion title="Roads" open={openSection === 'roads'} onToggle={() => onToggleSection('roads')} badge="Planned">
        <PlannedHint>No road model on Tile. Deferred.</PlannedHint>
        <Button variant="ghost" size="sm" disabled>
          Paint road
        </Button>
      </Accordion>

      <Accordion
        title="Borders"
        open={openSection === 'borders'}
        onToggle={() => onToggleSection('borders')}
        badge="Planned"
      >
        <PlannedHint>Ownership painting is not an editor brush yet. Clear Tile can clear ownerCivId.</PlannedHint>
        <Button variant="ghost" size="sm" disabled>
          Paint borders
        </Button>
      </Accordion>

      <Accordion
        title="Labels"
        open={openSection === 'labels'}
        onToggle={() => onToggleSection('labels')}
        badge="Planned"
      >
        <PlannedHint>No map-label persistence in F6.</PlannedHint>
        <Button variant="ghost" size="sm" disabled>
          Place label
        </Button>
      </Accordion>

      <Accordion
        title="Clear Tile"
        open={openSection === 'clear'}
        onToggle={() => onToggleSection('clear')}
      >
        <Button
          variant={builder.mode === 'clear' ? 'primary' : 'secondary'}
          size="sm"
          disabled={disabled}
          onClick={() => setMode('clear')}
        >
          Clear extras brush
        </Button>
        <p className="world-editor-field__hint">
          Keeps base terrain and cities. Removes features, hills, rivers, resource, and owner.
        </p>
      </Accordion>
    </div>
  )
}
