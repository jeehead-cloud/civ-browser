import { useState } from 'react'
import { useGameStore } from '../../game/store'
import { CivilizationsPanel } from '../CivilizationsPanel'
import { PlayersPanel } from '../PlayersPanel'
import { PlayControlPanel } from '../PlayControlPanel'
import { SettingsPanel } from '../SettingsPanel'
import { SegmentedControl } from '../ui'
import { CitiesSection } from './CitiesSection'
import { DisplaySection } from './DisplaySection'
import { TilesSection } from './TilesSection'

export type EditorPanelSection = 'tiles' | 'cities' | 'display' | 'simulation'

interface EditorRightPanelProps {
  activeSection: EditorPanelSection
  onSectionChange: (section: EditorPanelSection) => void
}

export function EditorRightPanel({ activeSection, onSectionChange }: EditorRightPanelProps) {
  const viewMode = useGameStore((s) => s.viewMode)
  const setViewMode = useGameStore((s) => s.setViewMode)
  const [openTileSubsection, setOpenTileSubsection] = useState<string | null>('terrain')

  const editEnabled = viewMode === 'edit'

  function toggleTileSubsection(id: string) {
    setOpenTileSubsection((prev) => (prev === id ? null : id))
  }

  return (
    <aside className="world-editor-right-panel" aria-label="World Editor tools">
      <div className="world-editor-right-panel__mode">
        <SegmentedControl
          ariaLabel="View or Edit mode"
          value={viewMode}
          onChange={(v) => setViewMode(v as 'edit' | 'view')}
          options={[
            { value: 'view', label: 'View' },
            { value: 'edit', label: 'Edit' },
          ]}
        />
        <p className="world-editor-right-panel__mode-hint">
          {viewMode === 'view'
            ? 'Click a tile for info. Painting is disabled.'
            : 'Click applies the active tool.'}
        </p>
      </div>

      <div className="world-editor-right-panel__nav">
        <SegmentedControl
          ariaLabel="Editor sections"
          size="sm"
          value={activeSection}
          onChange={(v) => onSectionChange(v as EditorPanelSection)}
          options={[
            { value: 'tiles', label: 'Tiles' },
            { value: 'cities', label: 'Cities' },
            { value: 'display', label: 'Display' },
            { value: 'simulation', label: 'Sim' },
          ]}
        />
      </div>

      <div className="world-editor-right-panel__body">
        {activeSection === 'tiles' ? (
          <TilesSection
            openSection={openTileSubsection}
            onToggleSection={toggleTileSubsection}
            editEnabled={editEnabled}
          />
        ) : null}
        {activeSection === 'cities' ? <CitiesSection editEnabled={editEnabled} /> : null}
        {activeSection === 'display' ? <DisplaySection /> : null}
        {activeSection === 'simulation' ? (
          <div className="world-editor-simulation">
            <p className="world-editor-simulation__banner" role="note">
              Temporary / legacy simulation controls. Final Active Game UI is F8–F10.
            </p>
            <CivilizationsPanel />
            <PlayControlPanel />
            <PlayersPanel />
            <SettingsPanel />
          </div>
        ) : null}
      </div>
    </aside>
  )
}
