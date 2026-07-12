import { useState } from 'react'
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
import { useCivilizationsCatalog } from '../catalog/hooks/useCivilizationsCatalog'
import type { CivilizationTemplate } from '../domain/civilizations'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

const EMPTY_FORM = {
  name: '',
  cultureName: '',
  flagEmoji: '🏳️',
  defaultColor: '#3b82f6',
  leader: '',
}

export function CivilizationsCatalogPage() {
  const catalog = useCivilizationsCatalog()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditorOpen(true)
  }

  function openEdit(item: CivilizationTemplate) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      cultureName: item.cultureName,
      flagEmoji: item.flagEmoji,
      defaultColor: item.defaultColor,
      leader: item.leader ?? '',
    })
    setFormError(null)
    setEditorOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    const payload = {
      name: form.name,
      cultureName: form.cultureName,
      flagEmoji: form.flagEmoji,
      defaultColor: form.defaultColor,
      leader: form.leader || undefined,
    }
    try {
      if (editingId) await catalog.updateCiv(editingId, payload)
      else await catalog.createCiv(payload)
      setEditorOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <AppShell title="Civilizations">
      <PageHeader
        eyebrow="Library / Civilizations"
        title="Civilizations Catalog"
        description="Reusable civilization templates (name, culture, flag, color). Templates are independent of legacy editor civilizations and game-session snapshots."
      />

      <div className="catalog-toolbar">
        <div className="catalog-toolbar__search">
          <Input
            aria-label="Search civilizations"
            placeholder="Search by name, culture, or leader"
            value={catalog.query}
            onChange={(e) => catalog.setQuery(e.target.value)}
          />
        </div>
        <Button variant="primary" size="md" onClick={openCreate} disabled={catalog.busy}>
          Create Civilization
        </Button>
      </div>

      {catalog.notice ? <div className="catalog-banner">{catalog.notice}</div> : null}
      {actionError ? (
        <div className="catalog-status-error" role="alert">
          {actionError}
        </div>
      ) : null}

      {catalog.status === 'loading' ? (
        <p style={{ color: 'var(--text-tertiary)' }}>Loading civilizations…</p>
      ) : null}

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
          title={catalog.query ? 'No matching civilizations' : 'No civilizations yet'}
          actions={
            <Button variant="primary" size="md" onClick={openCreate}>
              Create Civilization
            </Button>
          }
        >
          <p style={{ margin: 0 }}>
            {catalog.query
              ? 'Try a different search.'
              : 'Create a reusable template with name, culture, flag emoji, and default color.'}
          </p>
        </EmptyState>
      ) : null}

      {catalog.status === 'ready' && catalog.filtered.length > 0 ? (
        <div className="catalog-list">
          {catalog.filtered.map((item) => (
            <Card key={item.id}>
              <div className="catalog-item">
                <div className="catalog-civ">
                  <span className="catalog-civ__flag" aria-hidden>
                    {item.flagEmoji}
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="catalog-item__meta">
                      {item.cultureName}
                      {item.leader ? ` · Leader: ${item.leader}` : ''} · updated {formatDate(item.updatedAt)}
                    </p>
                    <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <span
                        className="catalog-civ__swatch"
                        style={{ background: item.defaultColor }}
                        title={item.defaultColor}
                        aria-label={`Color ${item.defaultColor}`}
                      />
                      <Badge tone="neutral">{item.defaultColor}</Badge>
                    </div>
                  </div>
                </div>
                <div className="catalog-item__actions">
                  <Button variant="primary" size="sm" onClick={() => openEdit(item)} disabled={catalog.busy}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void catalog.duplicateCiv(item.id).catch((e) => setActionError(String(e.message)))
                    }
                    disabled={catalog.busy}
                  >
                    Duplicate
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setPendingDeleteId(item.id)}
                    disabled={catalog.busy}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Dialog
        open={editorOpen}
        title={editingId ? 'Edit Civilization' : 'Create Civilization'}
        onClose={() => setEditorOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="md" onClick={() => setEditorOpen(false)} disabled={catalog.busy}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={() => void handleSave()} disabled={catalog.busy}>
              Save
            </Button>
          </div>
        }
      >
        <FormField label="Name" htmlFor="civ-name">
          <Input
            id="civ-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </FormField>
        <FormField label="Culture name" htmlFor="civ-culture">
          <Input
            id="civ-culture"
            value={form.cultureName}
            onChange={(e) => setForm((f) => ({ ...f, cultureName: e.target.value }))}
          />
        </FormField>
        <FormField label="Flag emoji" htmlFor="civ-flag">
          <Input
            id="civ-flag"
            value={form.flagEmoji}
            onChange={(e) => setForm((f) => ({ ...f, flagEmoji: e.target.value }))}
          />
        </FormField>
        <FormField label="Default color" htmlFor="civ-color" hint="Hex color, e.g. #3b82f6">
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <input
              type="color"
              aria-label="Pick color"
              value={/^#[0-9A-Fa-f]{6}$/.test(form.defaultColor) ? form.defaultColor : '#3b82f6'}
              onChange={(e) => setForm((f) => ({ ...f, defaultColor: e.target.value }))}
              style={{ width: 40, height: 36, padding: 0, border: '1px solid var(--border-subtle)', borderRadius: 6 }}
            />
            <Input
              id="civ-color"
              value={form.defaultColor}
              onChange={(e) => setForm((f) => ({ ...f, defaultColor: e.target.value }))}
            />
          </div>
        </FormField>
        <FormField label="Leader (optional)" htmlFor="civ-leader">
          <Input
            id="civ-leader"
            value={form.leader}
            onChange={(e) => setForm((f) => ({ ...f, leader: e.target.value }))}
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
        title="Delete civilization?"
        message="This removes the template from the catalog. Game sessions and legacy editor civilizations are not changed."
        confirmLabel="Delete"
        danger
        busy={catalog.busy}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return
          void catalog
            .deleteCiv(pendingDeleteId)
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
