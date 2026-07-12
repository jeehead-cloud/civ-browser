import { useState } from 'react'
import { useGameStore } from '../../game/store'
import { TerrainType } from '../../game/types'
import { ResourceDensity } from '../../game/mapLayers'
import { Accordion, Button, ConfirmDialog, SegmentedControl } from '../ui'
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

const DENSITY_OPTIONS: { value: ResourceDensity; label: string }[] = [
  { value: 'sparse', label: 'Sparse' },
  { value: 'standard', label: 'Standard' },
  { value: 'rich', label: 'Rich' },
]

type ConfirmKind =
  | 'clearFeatures'
  | 'clearMountains'
  | 'clearRivers'
  | 'clearResources'
  | 'terrainOnly'
  | null

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
  const generateTerrainLayer = useGameStore((s) => s.generateTerrainLayer)
  const clearFeaturesLayer = useGameStore((s) => s.clearFeaturesLayer)
  const generateFeaturesLayer = useGameStore((s) => s.generateFeaturesLayer)
  const clearMountainsHillsLayer = useGameStore((s) => s.clearMountainsHillsLayer)
  const addSmallMountainArea = useGameStore((s) => s.addSmallMountainArea)
  const addMountainChain = useGameStore((s) => s.addMountainChain)
  const clearRiversLayer = useGameStore((s) => s.clearRiversLayer)
  const addShortRiver = useGameStore((s) => s.addShortRiver)
  const addLongRiver = useGameStore((s) => s.addLongRiver)
  const clearResourcesLayer = useGameStore((s) => s.clearResourcesLayer)
  const generateResourcesLayer = useGameStore((s) => s.generateResourcesLayer)
  const resourceDensity = useGameStore((s) => s.resourceDensity)
  const setResourceDensity = useGameStore((s) => s.setResourceDensity)
  const lastLayerOpMessage = useGameStore((s) => s.lastLayerOpMessage)

  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)

  const disabled = !editEnabled || busy

  function run(op: () => void) {
    setBusy(true)
    try {
      op()
    } finally {
      setBusy(false)
    }
  }

  function handleConfirm() {
    const kind = confirm
    setConfirm(null)
    if (!kind) return
    run(() => {
      if (kind === 'clearFeatures') clearFeaturesLayer()
      else if (kind === 'clearMountains') clearMountainsHillsLayer()
      else if (kind === 'clearRivers') clearRiversLayer()
      else if (kind === 'clearResources') clearResourcesLayer()
      else if (kind === 'terrainOnly') generateTerrainLayer()
    })
  }

  const confirmCopy: Record<Exclude<ConfirmKind, null>, { title: string; message: string }> = {
    clearFeatures: {
      title: 'Clear all features?',
      message: 'Sets vegetation to none on every tile. Terrain, rivers, resources, and cities are preserved.',
    },
    clearMountains: {
      title: 'Clear mountains and hills?',
      message: 'Mountains become plains; hills are removed. Cities and other layers are preserved where valid.',
    },
    clearRivers: {
      title: 'Clear all rivers?',
      message: 'Empties river edges only. Terrain, features, resources, and cities are unchanged.',
    },
    clearResources: {
      title: 'Clear all resources?',
      message: 'Sets every tile resource to none. Other layers are unchanged.',
    },
    terrainOnly: {
      title: 'Generate terrain only?',
      message:
        'Regenerates base land/ocean/coast/lake/biomes. City tiles are skipped. Does not run mountain, river, feature, or resource generators — existing overlays stay when still valid.',
    },
  }

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
        {disabled && editEnabled ? (
          <p className="world-editor-tool-context__note">Layer operation running…</p>
        ) : null}
        {!editEnabled ? <p className="world-editor-tool-context__note">Switch to Edit mode to paint.</p> : null}
        {lastLayerOpMessage ? (
          <p className="world-editor-layer-feedback" role="status">
            {lastLayerOpMessage}
          </p>
        ) : null}
      </div>

      <Accordion title="Terrain" open={openSection === 'terrain'} onToggle={() => onToggleSection('terrain')}>
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
        <p className="world-editor-field__hint">
          Terrain Only regenerates biomes/coast without mountain, river, feature, or resource generators.
        </p>
        <div className="world-editor-inline-actions">
          <Button variant="primary" size="sm" disabled={disabled} onClick={() => setConfirm('terrainOnly')}>
            Generate Terrain Only
          </Button>
        </div>
        <p className="world-editor-field__hint" style={{ marginTop: 12 }}>
          Full map actions replace multiple layers (distinct from Terrain Only):
        </p>
        <div className="world-editor-inline-actions">
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => run(() => regenerateMap())}>
            Full Procedural
          </Button>
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => run(() => generateEarthMap())}>
            Earth-like (full)
          </Button>
        </div>
      </Accordion>

      <Accordion title="Features" open={openSection === 'features'} onToggle={() => onToggleSection('features')}>
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
        <div className="world-editor-inline-actions">
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => run(() => generateFeaturesLayer())}
          >
            Generate Features
          </Button>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setConfirm('clearFeatures')}>
            Clear All Features
          </Button>
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
        <p className="world-editor-field__hint">
          Random ops skip water and city tiles. Mountains never keep hills.
        </p>
        <div className="world-editor-inline-actions">
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => run(() => addSmallMountainArea())}
          >
            Random Small Area
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => run(() => addMountainChain())}
          >
            Random Chain
          </Button>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setConfirm('clearMountains')}>
            Clear All
          </Button>
        </div>
      </Accordion>

      <Accordion title="Rivers" open={openSection === 'rivers'} onToggle={() => onToggleSection('rivers')}>
        <Button
          variant={builder.mode === 'river' ? 'primary' : 'secondary'}
          size="sm"
          disabled={disabled}
          onClick={() => setMode('river')}
        >
          Edit river edges
        </Button>
        <p className="world-editor-field__hint">
          Random rivers flow downhill to water with mirrored edges. Short ≈ 3–10 steps; long ≈ 10–30.
        </p>
        <div className="world-editor-inline-actions">
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => run(() => addShortRiver())}>
            Random Short
          </Button>
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => run(() => addLongRiver())}>
            Random Long
          </Button>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setConfirm('clearRivers')}>
            Clear All Rivers
          </Button>
        </div>
      </Accordion>

      <Accordion title="Resources" open={openSection === 'resources'} onToggle={() => onToggleSection('resources')}>
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
        <div className="world-editor-field">
          <span className="world-editor-field__label">Density (placement chance)</span>
          <SegmentedControl
            ariaLabel="Resource density"
            size="sm"
            value={resourceDensity}
            onChange={(v) => !disabled && setResourceDensity(v as ResourceDensity)}
            options={DENSITY_OPTIONS}
          />
        </div>
        <p className="world-editor-field__hint">
          Density is a map-wide generation multiplier — not per-tile quantity. One resource max per tile.
        </p>
        <div className="world-editor-inline-actions">
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => run(() => generateResourcesLayer())}
          >
            Randomize Resources
          </Button>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setConfirm('clearResources')}>
            Clear All Resources
          </Button>
        </div>
      </Accordion>

      <Accordion
        title="Improvements"
        open={openSection === 'improvements'}
        onToggle={() => onToggleSection('improvements')}
        badge="Planned"
      >
        <PlannedHint>No improvement model. Deferred.</PlannedHint>
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
        <PlannedHint>Ownership painting is not an editor brush yet.</PlannedHint>
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
        <PlannedHint>No map-label persistence.</PlannedHint>
        <Button variant="ghost" size="sm" disabled>
          Place label
        </Button>
      </Accordion>

      <Accordion title="Clear Tile" open={openSection === 'clear'} onToggle={() => onToggleSection('clear')}>
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

      {confirm ? (
        <ConfirmDialog
          open
          title={confirmCopy[confirm].title}
          message={confirmCopy[confirm].message}
          confirmLabel="Continue"
          cancelLabel="Cancel"
          danger={confirm.startsWith('clear')}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  )
}
