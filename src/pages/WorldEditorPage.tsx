import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapCanvas } from '../components/MapCanvas'
import { Toolbar } from '../components/Toolbar'
import { CityModal } from '../components/CityModal'
import { TileInfoPanel } from '../components/TileInfoPanel'
import { CivilizationsPanel } from '../components/CivilizationsPanel'
import { SettingsPanel } from '../components/SettingsPanel'
import { PlayControlPanel } from '../components/PlayControlPanel'
import { PlayersPanel } from '../components/PlayersPanel'
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, FormField, Input } from '../components/ui'
import { useSelectedMapEditor } from '../catalog/hooks/useSelectedMapEditor'

function formatSavedAt(iso: string | null): string {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/** Existing MVP World Editor — F5 selected-map load/save; visual redesign remains F6. */
export function WorldEditorPage() {
  const { mapId } = useParams<{ mapId: string }>()
  const editor = useSelectedMapEditor(mapId)
  const [metaOpen, setMetaOpen] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [metaName, setMetaName] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [saveAsName, setSaveAsName] = useState('')

  if (!editor.isScratch && editor.status === 'loading') {
    return (
      <div className="app-shell" style={{ minHeight: '100vh' }}>
        <main className="app-shell__main">
          <p style={{ color: 'var(--text-tertiary)' }}>Loading map…</p>
        </main>
      </div>
    )
  }

  if (!editor.isScratch && editor.status === 'not_found') {
    return (
      <div className="app-shell" style={{ minHeight: '100vh' }}>
        <main className="app-shell__main">
          <EmptyState
            title="Map not found"
            actions={
              <Link to="/library/maps" className="ui-button ui-button--primary ui-button--md">
                Back to Maps Catalog
              </Link>
            }
          >
            <p style={{ margin: 0 }}>No catalog map with id “{mapId}”.</p>
          </EmptyState>
        </main>
      </div>
    )
  }

  if (!editor.isScratch && editor.status === 'error') {
    return (
      <div className="app-shell" style={{ minHeight: '100vh' }}>
        <main className="app-shell__main">
          <EmptyState
            title="Could not load map"
            actions={
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <Button variant="primary" size="md" onClick={() => void editor.reload()}>
                  Retry
                </Button>
                <Link to="/library/maps" className="ui-button ui-button--secondary ui-button--md">
                  Maps Catalog
                </Link>
              </div>
            }
          >
            <p style={{ margin: 0 }}>{editor.error}</p>
          </EmptyState>
        </main>
      </div>
    )
  }

  const titleName = editor.isScratch
    ? 'Scratch editor'
    : editor.activeCatalogMapName || 'Untitled map'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'var(--font-sans)' }}>
      <div className="world-editor-chrome">
        <Link to="/">← Main Menu</Link>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <Link to="/library/maps">Maps Catalog</Link>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <span>
          {editor.isScratch ? 'Current World Editor · scratch (not catalog-backed)' : `Editing · ${titleName}`}
        </span>
        {!editor.isScratch ? (
          <>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <Badge tone={editor.editorDirty ? 'warning' : 'success'}>
              {editor.editorDirty ? 'Unsaved changes' : 'Saved'}
            </Badge>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-size-xs)' }}>
              Last saved: {formatSavedAt(editor.lastSavedAt)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMetaName(editor.activeCatalogMapName)
                setMetaDescription(editor.activeCatalogMapDescription)
                setMetaOpen(true)
              }}
            >
              Rename
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={editor.saving || !editor.editorDirty}
              onClick={() => void editor.save().catch(() => undefined)}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={editor.saving}
              onClick={() => {
                setSaveAsName(`${editor.activeCatalogMapName} Copy`)
                setSaveAsOpen(true)
              }}
            >
              Save As
            </Button>
          </>
        ) : null}
      </div>

      {editor.saveNotice ? (
        <div className="catalog-bridge-banner" role="status">
          {editor.saveNotice}
        </div>
      ) : null}
      {editor.saveError ? (
        <div className="catalog-status-error" role="alert">
          {editor.saveError}
        </div>
      ) : null}
      {editor.isScratch ? (
        <div className="catalog-bridge-banner" role="status">
          Scratch editor — open a map from the Maps Catalog to save into IndexedDB. Changes here are not catalog-backed.
        </div>
      ) : null}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, background: '#f8fafc', color: '#111' }}>
        <Toolbar />
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Civ Browser — World Builder (MVP)</h2>
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

      <Dialog
        open={metaOpen}
        title="Map details"
        onClose={() => setMetaOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="md" onClick={() => setMetaOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                editor.setCatalogMapMeta({ name: metaName, description: metaDescription })
                setMetaOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        }
      >
        <FormField label="Name" htmlFor="editor-map-name">
          <Input id="editor-map-name" value={metaName} onChange={(e) => setMetaName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Description" htmlFor="editor-map-desc">
          <textarea
            id="editor-map-desc"
            className="ui-textarea"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
          />
        </FormField>
      </Dialog>

      <Dialog
        open={saveAsOpen}
        title="Save As"
        onClose={() => setSaveAsOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="md" onClick={() => setSaveAsOpen(false)} disabled={editor.saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={editor.saving || !saveAsName.trim()}
              onClick={() =>
                void editor
                  .saveAs(saveAsName.trim())
                  .then(() => setSaveAsOpen(false))
                  .catch(() => undefined)
              }
            >
              Save As
            </Button>
          </div>
        }
      >
        <FormField label="New map name" htmlFor="editor-save-as-name">
          <Input
            id="editor-save-as-name"
            value={saveAsName}
            onChange={(e) => setSaveAsName(e.target.value)}
            autoFocus
          />
        </FormField>
      </Dialog>

      <ConfirmDialog
        open={editor.blocker.state === 'blocked'}
        title="Unsaved changes"
        message="You have unsaved map edits. Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        danger
        onCancel={() => editor.blocker.reset?.()}
        onConfirm={() => editor.blocker.proceed?.()}
      />
    </div>
  )
}
