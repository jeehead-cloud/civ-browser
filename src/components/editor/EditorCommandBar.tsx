import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button } from '../ui'

export interface EditorCommandBarProps {
  isScratch: boolean
  mapName: string
  dirty: boolean
  lastSavedLabel: string
  saving: boolean
  onSave: () => void
  onSaveAs: () => void
  onMapDescription: () => void
  onImportJson: () => void
  onExportJson: () => void
  onFocusDisplay: () => void
}

function formatStatus(isScratch: boolean, dirty: boolean): { label: string; tone: 'neutral' | 'warning' | 'success' | 'info' } {
  if (isScratch) return { label: 'Scratch Map', tone: 'info' }
  if (dirty) return { label: 'Unsaved', tone: 'warning' }
  return { label: 'Saved', tone: 'success' }
}

/** Compact top command bar for World Editor (F6). */
export function EditorCommandBar({
  isScratch,
  mapName,
  dirty,
  lastSavedLabel,
  saving,
  onSave,
  onSaveAs,
  onMapDescription,
  onImportJson,
  onExportJson,
  onFocusDisplay,
}: EditorCommandBarProps) {
  const status = formatStatus(isScratch, dirty)

  return (
    <header className="world-editor-command-bar" role="toolbar" aria-label="World Editor commands">
      <div className="world-editor-command-bar__group">
        <Link to="/library/maps" className="ui-button ui-button--ghost ui-button--sm">
          ← Maps
        </Link>
        <span className="world-editor-command-bar__title" title={mapName}>
          {mapName}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
        {!isScratch ? (
          <span className="world-editor-command-bar__meta">Saved {lastSavedLabel}</span>
        ) : (
          <span className="world-editor-command-bar__meta">Not catalog-backed</span>
        )}
      </div>

      <div className="world-editor-command-bar__group world-editor-command-bar__group--actions">
        <Button
          variant="primary"
          size="sm"
          disabled={isScratch || saving || !dirty}
          title={isScratch ? 'Scratch maps cannot overwrite a catalog item — use Save As' : undefined}
          onClick={onSave}
        >
          Save
        </Button>
        <Button variant="secondary" size="sm" disabled={saving} onClick={onSaveAs}>
          Save As
        </Button>
        <Button variant="ghost" size="sm" onClick={onMapDescription}>
          Description
        </Button>
        <Link to="/library/maps?create=1" className="ui-button ui-button--ghost ui-button--sm">
          New Map
        </Link>
        <Link to="/library/maps" className="ui-button ui-button--ghost ui-button--sm">
          Open
        </Link>
        <Button variant="ghost" size="sm" disabled title="Planned — safe hex resize not implemented">
          Resize
        </Button>
        <Button variant="ghost" size="sm" disabled title="Planned — deferred to avoid a second map renderer">
          Mini-map
        </Button>
        <Button variant="ghost" size="sm" onClick={onFocusDisplay} title="Open Display section">
          View Mode
        </Button>
        <Button variant="ghost" size="sm" onClick={onImportJson} title="Import legacy JSON (marks dirty)">
          Import JSON
        </Button>
        <Button variant="ghost" size="sm" onClick={onExportJson} title="Export current editor state as JSON">
          Export JSON
        </Button>
      </div>
    </header>
  )
}

export function PlannedHint({ children }: { children: ReactNode }) {
  return <p className="world-editor-planned-hint">{children}</p>
}
