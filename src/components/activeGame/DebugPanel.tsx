import { Badge, Button, Panel, SegmentedControl } from '../ui'
import type { ResourceType, TerrainType, VegetationType } from '../../game/types'
import type { DebugInteractionMode, DebugTool, DebugToolSettings } from '../../gameSession/debugOps'

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

const FEATURES: VegetationType[] = ['none', 'forest', 'jungle', 'swamp']

const RESOURCES: ResourceType[] = [
  'none',
  'wheat',
  'deer',
  'fish',
  'stone',
  'horses',
  'iron',
  'gold',
  'oil',
]

const TOOLS: { value: DebugTool; label: string }[] = [
  { value: 'terrain', label: 'Terrain' },
  { value: 'features', label: 'Features' },
  { value: 'hills', label: 'Hills' },
  { value: 'mountains', label: 'Mountains' },
  { value: 'rivers', label: 'Rivers' },
  { value: 'resources', label: 'Resources' },
  { value: 'clear', label: 'Clear Tile' },
]

interface DebugPanelProps {
  interactionMode: DebugInteractionMode
  tool: DebugTool
  settings: DebugToolSettings
  lastEditMessage: string | null
  pendingChangedTileCount: number
  saveBusy: boolean
  onModeChange: (mode: DebugInteractionMode) => void
  onToolChange: (tool: DebugTool) => void
  onTerrainChange: (t: TerrainType) => void
  onFeatureChange: (v: VegetationType) => void
  onResourceChange: (r: ResourceType) => void
  onElevationActionChange: (a: DebugToolSettings['elevationAction']) => void
  onSave: () => void
  onDisable: () => void
}

export function DebugPanel({
  interactionMode,
  tool,
  settings,
  lastEditMessage,
  pendingChangedTileCount,
  saveBusy,
  onModeChange,
  onToolChange,
  onTerrainChange,
  onFeatureChange,
  onResourceChange,
  onElevationActionChange,
  onSave,
  onDisable,
}: DebugPanelProps) {
  return (
    <Panel className="active-game-debug-panel" aria-label="Debug editing tools">
      <div className="active-game-debug-panel__header">
        <Badge tone="warning">Debug Editing Active</Badge>
        <p className="active-game-debug-panel__warn">
          Development tool — edits only this game session. Source map, civilization templates, and
          rules presets stay unchanged.
        </p>
      </div>

      <div className="active-game-debug-panel__section">
        <span className="active-game-debug-panel__label" id="debug-mode-label">
          Mode
        </span>
        <SegmentedControl
          ariaLabel="Debug interaction mode"
          size="sm"
          value={interactionMode}
          onChange={(v) => onModeChange(v as DebugInteractionMode)}
          options={[
            { value: 'inspect', label: 'Inspect' },
            { value: 'edit', label: 'Edit' },
          ]}
        />
      </div>

      <div className="active-game-debug-panel__section">
        <span className="active-game-debug-panel__label">Tool</span>
        <div className="active-game-debug-tools" role="listbox" aria-label="Debug tools">
          {TOOLS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="option"
              aria-selected={tool === t.value}
              className={
                tool === t.value
                  ? 'active-game-debug-tool active-game-debug-tool--active'
                  : 'active-game-debug-tool'
              }
              onClick={() => onToolChange(t.value)}
              disabled={interactionMode !== 'edit'}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {interactionMode === 'edit' ? (
        <div className="active-game-debug-panel__section">
          <span className="active-game-debug-panel__label">Tool settings</span>
          {tool === 'terrain' ? (
            <select
              className="ui-input"
              aria-label="Terrain type"
              value={settings.terrain}
              onChange={(e) => onTerrainChange(e.target.value as TerrainType)}
            >
              {TERRAINS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : null}
          {tool === 'features' ? (
            <select
              className="ui-input"
              aria-label="Feature type"
              value={settings.feature}
              onChange={(e) => onFeatureChange(e.target.value as VegetationType)}
            >
              {FEATURES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          ) : null}
          {tool === 'resources' ? (
            <select
              className="ui-input"
              aria-label="Resource type"
              value={settings.resource}
              onChange={(e) => onResourceChange(e.target.value as ResourceType)}
            >
              {RESOURCES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : null}
          {tool === 'hills' || tool === 'mountains' ? (
            <SegmentedControl
              ariaLabel={`${tool} action`}
              size="sm"
              value={settings.elevationAction}
              onChange={(v) =>
                onElevationActionChange(v as DebugToolSettings['elevationAction'])
              }
              options={[
                { value: 'toggle', label: 'Toggle' },
                { value: 'add', label: 'Add' },
                { value: 'remove', label: 'Remove' },
              ]}
            />
          ) : null}
          {tool === 'rivers' ? (
            <p className="active-game-muted" style={{ margin: 0 }}>
              Click near a hex edge to toggle a mirrored river.
            </p>
          ) : null}
          {tool === 'clear' ? (
            <p className="active-game-muted" style={{ margin: 0 }}>
              Clears features, hills, rivers, and resources. Keeps terrain and cities.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="active-game-muted" style={{ margin: 0 }}>
          Inspect mode: tile/city popups work; no painting.
        </p>
      )}

      {pendingChangedTileCount > 0 ? (
        <p className="active-game-debug-panel__pending" role="status">
          Unsaved debug changes: {pendingChangedTileCount} tile update
          {pendingChangedTileCount === 1 ? '' : 's'}
        </p>
      ) : null}

      {lastEditMessage ? (
        <p className="active-game-topbar__error" role="status">
          {lastEditMessage}
        </p>
      ) : null}

      <div className="active-game-debug-panel__actions">
        <Button variant="secondary" size="sm" type="button" disabled={saveBusy} onClick={onSave}>
          Save Game
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={onDisable}>
          Disable Debug Mode
        </Button>
      </div>
    </Panel>
  )
}
