import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  EmptyState,
  FormField,
  Input,
  PageHeader,
} from '../components/ui'
import { useMapsCatalog } from '../catalog/hooks/useMapsCatalog'
import {
  CATALOG_MAP_DEFAULT_HEIGHT,
  CATALOG_MAP_DEFAULT_WIDTH,
  CATALOG_MAP_MAX_HEIGHT,
  CATALOG_MAP_MAX_WIDTH,
  CATALOG_MAP_MIN_SIZE,
  mapReadiness,
} from '../catalog/mapFactory'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function readinessLabel(value: ReturnType<typeof mapReadiness>): string {
  if (value === 'ready') return 'Ready'
  if (value === 'draft') return 'Draft'
  return 'Blank'
}

export function MapsCatalogPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const catalog = useMapsCatalog()
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('create') === '1')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [width, setWidth] = useState(CATALOG_MAP_DEFAULT_WIDTH)
  const [height, setHeight] = useState(CATALOG_MAP_DEFAULT_HEIGHT)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setCreateOpen(true)
    }
  }, [searchParams])

  function closeCreateDialog() {
    setCreateOpen(false)
    if (searchParams.get('create') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('create')
      setSearchParams(next, { replace: true })
    }
  }

  async function handleCreate() {
    setFormError(null)
    try {
      await catalog.createMap({ name, description, width, height })
      closeCreateDialog()
      setName('')
      setDescription('')
      setWidth(CATALOG_MAP_DEFAULT_WIDTH)
      setHeight(CATALOG_MAP_DEFAULT_HEIGHT)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Create failed')
    }
  }

  async function handleImport(file: File | null) {
    if (!file) return
    setActionError(null)
    try {
      const text = await file.text()
      const base = file.name.replace(/\.json$/i, '')
      await catalog.importJson(text, base)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleOpen(id: string) {
    setActionError(null)
    navigate(`/library/maps/${id}/edit`)
  }

  return (
    <AppShell title="Maps">
      <PageHeader
        eyebrow="Library / Maps"
        title="Maps Catalog"
        description="Reusable map templates stored in IndexedDB. Open loads `/library/maps/:mapId/edit` and saves write back to the selected catalog item."
      />

      <div className="catalog-toolbar">
        <div className="catalog-toolbar__search">
          <Input
            aria-label="Search maps"
            placeholder="Search by name or description"
            value={catalog.query}
            onChange={(e) => catalog.setQuery(e.target.value)}
          />
        </div>
        <Button variant="primary" size="md" onClick={() => setCreateOpen(true)} disabled={catalog.busy}>
          Create Map
        </Button>
        <Button variant="secondary" size="md" onClick={() => fileRef.current?.click()} disabled={catalog.busy}>
          Import JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void handleImport(e.target.files?.[0] ?? null)}
        />
        <Link to="/library/maps/current/edit" className="ui-button ui-button--ghost ui-button--md">
          Scratch Editor
        </Link>
      </div>

      {catalog.notice ? <div className="catalog-banner">{catalog.notice}</div> : null}
      {actionError ? (
        <div className="catalog-status-error" role="alert">
          {actionError}
        </div>
      ) : null}

      {catalog.status === 'loading' ? <p style={{ color: 'var(--text-tertiary)' }}>Loading maps…</p> : null}

      {catalog.status === 'error' ? (
        <EmptyState
          title="Could not open catalog"
          actions={
            <Button variant="secondary" size="md" onClick={() => void catalog.refresh()}>
              Retry
            </Button>
          }
        >
          <p style={{ margin: 0 }}>{catalog.error}</p>
        </EmptyState>
      ) : null}

      {catalog.status === 'ready' && catalog.filtered.length === 0 ? (
        <EmptyState
          title={catalog.query ? 'No matching maps' : 'No maps yet'}
          actions={
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              Create Map
            </Button>
          }
        >
          <p style={{ margin: 0 }}>
            {catalog.query
              ? 'Try a different search.'
              : 'Create a blank ocean map or import a version-1 JSON export from the World Editor.'}
          </p>
        </EmptyState>
      ) : null}

      {catalog.status === 'ready' && catalog.filtered.length > 0 ? (
        <div className="catalog-list">
          {catalog.filtered.map((map) => {
            const readiness = mapReadiness(map)
            return (
              <Card key={map.id}>
                <div className="catalog-item">
                  <div>
                    <strong>{map.name}</strong>
                    <p className="catalog-item__meta">
                      {map.width}×{map.height} · {map.cities.length} cities · updated {formatDate(map.updatedAt)}
                    </p>
                    {map.description ? (
                      <p className="catalog-item__meta" style={{ marginTop: 'var(--space-1)' }}>
                        {map.description}
                      </p>
                    ) : null}
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <Badge tone={readiness === 'ready' ? 'success' : readiness === 'draft' ? 'warning' : 'neutral'}>
                        {readinessLabel(readiness)}
                      </Badge>
                    </div>
                  </div>
                  <div className="catalog-item__actions">
                    <Button variant="primary" size="sm" onClick={() => void handleOpen(map.id)} disabled={catalog.busy}>
                      Open
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void catalog.duplicateMap(map.id).catch((e) => setActionError(String(e.message)))}
                      disabled={catalog.busy}
                    >
                      Duplicate
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void catalog.exportMap(map.id).catch((e) => setActionError(String(e.message)))}
                      disabled={catalog.busy}
                    >
                      Export
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setPendingDeleteId(map.id)}
                      disabled={catalog.busy}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : null}

      <Dialog
        open={createOpen}
        title="Create Map"
        onClose={closeCreateDialog}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="md" onClick={closeCreateDialog} disabled={catalog.busy}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={() => void handleCreate()} disabled={catalog.busy}>
              Create
            </Button>
          </div>
        }
      >
        <FormField label="Name" htmlFor="map-name" error={formError && !name.trim() ? 'Required' : undefined}>
          <Input id="map-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Description" htmlFor="map-desc">
          <textarea
            id="map-desc"
            className="ui-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormField
          label="Width"
          htmlFor="map-width"
          hint={`${CATALOG_MAP_MIN_SIZE}–${CATALOG_MAP_MAX_WIDTH}. New maps start as blank ocean.`}
        >
          <Input
            id="map-width"
            type="number"
            min={CATALOG_MAP_MIN_SIZE}
            max={CATALOG_MAP_MAX_WIDTH}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </FormField>
        <FormField label="Height" htmlFor="map-height" hint={`${CATALOG_MAP_MIN_SIZE}–${CATALOG_MAP_MAX_HEIGHT}`}>
          <Input
            id="map-height"
            type="number"
            min={CATALOG_MAP_MIN_SIZE}
            max={CATALOG_MAP_MAX_HEIGHT}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </FormField>
        {formError ? (
          <p className="ui-form-field__error" role="alert">
            {formError}
          </p>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title="Delete map?"
        message="This removes the map template from the catalog. Existing game sessions are not deleted. This cannot be undone."
        confirmLabel="Delete"
        danger
        busy={catalog.busy}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return
          void catalog
            .deleteMap(pendingDeleteId)
            .then(() => setPendingDeleteId(null))
            .catch((e) => {
              setActionError(e instanceof Error ? e.message : 'Delete failed')
              setPendingDeleteId(null)
            })
        }}
      />
    </AppShell>
  )
}
