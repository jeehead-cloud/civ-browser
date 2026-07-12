import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapCanvas } from '../components/MapCanvas'
import { CityModal } from '../components/CityModal'
import { TileInfoPanel } from '../components/TileInfoPanel'
import { EditorCommandBar } from '../components/editor/EditorCommandBar'
import {
  EditorPanelSection,
  EditorRightPanel,
} from '../components/editor/EditorRightPanel'
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, FormField, Input } from '../components/ui'
import { useSelectedMapEditor } from '../catalog/hooks/useSelectedMapEditor'
import { useGameStore } from '../game/store'

function formatSavedAt(iso: string | null): string {
  if (!iso) return 'never'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/** World Editor — F6 command bar + map + right panel; F5 persistence preserved. */
export function WorldEditorPage() {
  const { mapId } = useParams<{ mapId: string }>()
  const editor = useSelectedMapEditor(mapId)
  const exportMap = useGameStore((s) => s.exportMap)
  const importMap = useGameStore((s) => s.importMap)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [metaOpen, setMetaOpen] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [metaName, setMetaName] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [saveAsName, setSaveAsName] = useState('')
  const [saveAsDescription, setSaveAsDescription] = useState('')
  const [panelSection, setPanelSection] = useState<EditorPanelSection>('tiles')
  const [panelOpen, setPanelOpen] = useState(true)

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
    ? 'Scratch Map'
    : editor.activeCatalogMapName || 'Untitled map'

  function handleExportJson() {
    const json = exportMap()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    a.href = url
    a.download = `civ-map-${timestamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importMap(reader.result as string)
      if (!result.success) {
        editor.setSaveError('Import failed: ' + (result.error ?? 'unknown'))
        window.alert('Import failed: ' + result.error)
      } else {
        editor.setSaveNotice('Imported JSON — save to persist to catalog.')
        editor.setSaveError(null)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="world-editor-shell">
      <EditorCommandBar
        isScratch={editor.isScratch}
        mapName={titleName}
        dirty={editor.editorDirty}
        lastSavedLabel={formatSavedAt(editor.lastSavedAt)}
        saving={editor.saving}
        onSave={() => void editor.save().catch(() => undefined)}
        onSaveAs={() => {
          setSaveAsName(
            editor.isScratch
              ? 'New map'
              : `${editor.activeCatalogMapName || 'Map'} Copy`,
          )
          setSaveAsDescription(editor.activeCatalogMapDescription)
          setSaveAsOpen(true)
        }}
        onMapDescription={() => {
          setMetaName(editor.activeCatalogMapName)
          setMetaDescription(editor.activeCatalogMapDescription)
          setMetaOpen(true)
        }}
        onImportJson={() => fileInputRef.current?.click()}
        onExportJson={handleExportJson}
        onFocusDisplay={() => {
          setPanelOpen(true)
          setPanelSection('display')
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

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
          Scratch Map — Save is disabled (cannot overwrite an unrelated catalog item). Use Save As to create a
          catalog map, or open a map from the catalog.
        </div>
      ) : null}

      <div className="world-editor-body">
        <div className="world-editor-map-column">
          <div className="world-editor-map-toolbar-mobile">
            <Button variant="secondary" size="sm" onClick={() => setPanelOpen((v) => !v)}>
              {panelOpen ? 'Hide tools' : 'Show tools'}
            </Button>
            {!editor.isScratch ? (
              <Badge tone={editor.editorDirty ? 'warning' : 'success'}>
                {editor.editorDirty ? 'Unsaved' : 'Saved'}
              </Badge>
            ) : null}
          </div>
          <MapCanvas />
        </div>
        {panelOpen ? (
          <EditorRightPanel activeSection={panelSection} onSectionChange={setPanelSection} />
        ) : null}
      </div>

      <CityModal />
      <TileInfoPanel />

      <Dialog
        open={metaOpen}
        title="Map Description"
        onClose={() => setMetaOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="md" onClick={() => setMetaOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!metaName.trim()}
              onClick={() => {
                editor.setCatalogMapMeta({
                  name: metaName.trim(),
                  description: metaDescription,
                })
                setMetaOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        }
      >
        <FormField label="Name" htmlFor="editor-map-name">
          <Input
            id="editor-map-name"
            value={metaName}
            onChange={(e) => setMetaName(e.target.value)}
            autoFocus
          />
        </FormField>
        <FormField label="Description" htmlFor="editor-map-desc">
          <textarea
            id="editor-map-desc"
            className="ui-textarea"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
          />
        </FormField>
        {editor.isScratch ? (
          <p className="world-editor-field__hint">
            Scratch metadata is local until Save As creates a catalog item.
          </p>
        ) : (
          <p className="world-editor-field__hint">Marks the editor dirty; Save persists to the catalog.</p>
        )}
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
                  .saveAs(saveAsName.trim(), saveAsDescription)
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
        <FormField label="Description" htmlFor="editor-save-as-desc">
          <textarea
            id="editor-save-as-desc"
            className="ui-textarea"
            value={saveAsDescription}
            onChange={(e) => setSaveAsDescription(e.target.value)}
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
