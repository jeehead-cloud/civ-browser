import { useState } from 'react'
import { AppShell } from '../components/AppShell'
import { ParameterField } from '../components/rules/ParameterField'
import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  FormField,
  Input,
  PageHeader,
} from '../components/ui'
import {
  fieldChanged,
  RULES_CATEGORIES,
  searchParameters,
} from '../rules/parameterDefinitions'
import { useRulesPresets } from '../rules/hooks/useRulesPresets'
import { isStandardPresetId } from '../rules/rulesPresetService'

export function SettingsBalancePage() {
  const editor = useRulesPresets()
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dirtyAction, setDirtyAction] = useState<'create' | 'duplicate' | null>(null)

  if (editor.status === 'loading') {
    return (
      <AppShell title="Settings & Balance">
        <PageHeader eyebrow="Settings" title="Settings & Balance" description="Loading presets…" />
        <p style={{ color: 'var(--text-tertiary)' }}>Loading rules presets…</p>
      </AppShell>
    )
  }

  if (editor.status === 'error') {
    return (
      <AppShell title="Settings & Balance">
        <PageHeader eyebrow="Settings" title="Settings & Balance" />
        <EmptyState
          title="Could not load rules presets"
          actions={
            <Button variant="primary" size="md" onClick={() => void editor.refresh()}>
              Retry
            </Button>
          }
        >
          <p style={{ margin: 0 }}>{editor.error}</p>
        </EmptyState>
      </AppShell>
    )
  }

  if (!editor.draftSettings || !editor.persisted) {
    return (
      <AppShell title="Settings & Balance">
        <EmptyState title="No preset selected">
          <p style={{ margin: 0 }}>Open Settings again or click Retry on the error screen.</p>
        </EmptyState>
      </AppShell>
    )
  }

  const params = searchParameters(editor.search, {
    categoryId: editor.changedOnly || editor.search.trim() ? undefined : editor.categoryId,
    changedOnly: editor.changedOnly,
    draft: editor.draftSettings,
    persisted: editor.persisted.settings,
  }).filter((p) => {
    // When searching globally, still allow; when not searching/changed-only, filter by category
    if (editor.search.trim() || editor.changedOnly) return true
    return p.category === editor.categoryId
  })

  async function openCreateFlow() {
    if (editor.dirty) {
      setDirtyAction('create')
      return
    }
    setCreateName('New preset')
    setCreateError(null)
    setCreateOpen(true)
  }

  async function openDuplicateFlow() {
    if (editor.dirty) {
      setDirtyAction('duplicate')
      return
    }
    try {
      await editor.duplicate()
    } catch (err) {
      editor.setNotice(err instanceof Error ? err.message : 'Duplicate failed')
    }
  }

  return (
    <AppShell title="Settings & Balance">
      <PageHeader
        eyebrow="Settings"
        title="Settings & Balance"
        description="Reusable game rules presets. Editing a preset does not change maps, active games, or the World Editor simulation panel."
      />
      <div className="rules-presets-actions" style={{ marginBottom: 'var(--space-5)' }}>
        <Button variant="secondary" size="sm" disabled={editor.busy} onClick={() => void openCreateFlow()}>
          Create
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={editor.busy || !editor.selectedId}
          onClick={() => void openDuplicateFlow()}
        >
          Create Copy
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={editor.busy || editor.isStandard}
          title={editor.isStandard ? 'Standard cannot be deleted' : undefined}
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      {editor.notice ? (
        <div className="catalog-banner" role="status">
          {editor.notice}
        </div>
      ) : null}
      {editor.saveError ? (
        <div className="catalog-status-error" role="alert">
          {editor.saveError}
        </div>
      ) : null}

      <div className="rules-presets-toolbar">
        <FormField label="Preset" htmlFor="rules-preset-select">
          <select
            id="rules-preset-select"
            className="ui-input"
            value={editor.selectedId ?? ''}
            disabled={editor.busy}
            onChange={(e) => editor.selectPreset(e.target.value)}
          >
            {editor.presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {isStandardPresetId(p.id) ? ' (Standard)' : ''}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Preset name" htmlFor="rules-preset-name">
          <Input
            id="rules-preset-name"
            value={editor.draftName}
            disabled={editor.busy}
            onChange={(e) => editor.setDraftName(e.target.value)}
          />
        </FormField>
        <div className="rules-presets-toolbar__status">
          <Badge tone={editor.dirty ? 'warning' : 'success'}>
            {editor.dirty ? 'Unsaved changes' : 'Saved'}
          </Badge>
          {editor.isStandard ? <Badge tone="info">Protected default</Badge> : null}
        </div>
        <div className="rules-presets-toolbar__save">
          <Button
            variant="secondary"
            size="sm"
            disabled={editor.busy || !editor.dirty}
            onClick={editor.revertUnsaved}
          >
            Revert Unsaved
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={editor.busy || !editor.dirty || editor.hasFieldErrors}
            onClick={() => void editor.save()}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="rules-presets-layout">
        <nav className="rules-presets-nav" aria-label="Rules categories">
          <p className="rules-presets-nav__heading">Categories</p>
          <ul className="rules-presets-nav__list">
            {RULES_CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  className={`rules-presets-nav__btn${editor.categoryId === cat.id ? ' is-active' : ''}${!cat.active ? ' is-planned' : ''}`}
                  disabled={!cat.active || editor.busy}
                  aria-current={editor.categoryId === cat.id ? 'page' : undefined}
                  onClick={() => cat.active && editor.setCategoryId(cat.id)}
                >
                  {cat.label}
                  {!cat.active ? <span className="rules-presets-nav__planned">Planned</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className="rules-presets-params" aria-label="Parameters">
          <div className="rules-presets-filters">
            <FormField label="Search parameters" htmlFor="rules-param-search">
              <Input
                id="rules-param-search"
                value={editor.search}
                placeholder="Search by name or description"
                onChange={(e) => editor.setSearch(e.target.value)}
              />
            </FormField>
            <label className="rules-presets-changed-toggle">
              <input
                type="checkbox"
                checked={editor.changedOnly}
                onChange={(e) => editor.setChangedOnly(e.target.checked)}
              />
              Show changed only
            </label>
          </div>

          <div className="rules-presets-reset-row">
            <Button
              variant="ghost"
              size="sm"
              disabled={editor.busy}
              onClick={editor.resetCategoryToDefaults}
            >
              Reset Category
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={editor.busy}
              onClick={editor.resetPresetToDefaults}
            >
              Reset Preset to Defaults
            </Button>
          </div>

          {params.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)' }}>No parameters match this filter.</p>
          ) : (
            params.map((def) => (
              <ParameterField
                key={def.key}
                definition={def}
                storageValue={editor.draftSettings![def.key]}
                changed={fieldChanged(def.key, editor.draftSettings!, editor.persisted!.settings)}
                error={editor.fieldErrors[def.key]}
                disabled={editor.busy}
                onChange={(v) => editor.setSetting(def.key, v)}
                onReset={() => editor.resetFieldToDefault(def.key)}
              />
            ))
          )}
        </section>
      </div>

      <Dialog
        open={createOpen}
        title="Create rules preset"
        onClose={() => setCreateOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="md" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={editor.busy || !createName.trim()}
              onClick={() =>
                void editor
                  .create(createName.trim())
                  .then(() => setCreateOpen(false))
                  .catch((err) => setCreateError(err instanceof Error ? err.message : 'Create failed'))
              }
            >
              Create
            </Button>
          </div>
        }
      >
        <FormField label="Name" htmlFor="create-preset-name" error={createError ?? undefined}>
          <Input
            id="create-preset-name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            autoFocus
          />
        </FormField>
        <p className="world-editor-field__hint">
          Copies settings from the currently selected preset ({editor.persisted.name}).
        </p>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete preset"
        message={`Delete “${editor.persisted.name}”? Existing game sessions keep their own rules snapshot.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false)
          void editor.remove().catch((err) => {
            editor.setNotice(err instanceof Error ? err.message : 'Delete failed')
          })
        }}
      />

      <ConfirmDialog
        open={Boolean(editor.pendingSwitchId)}
        title="Unsaved changes"
        message="You have unsaved preset edits. Switch preset and discard them?"
        confirmLabel="Discard and switch"
        cancelLabel="Stay"
        danger
        onCancel={editor.cancelSwitchPreset}
        onConfirm={editor.confirmSwitchPreset}
      />

      <ConfirmDialog
        open={Boolean(dirtyAction)}
        title="Unsaved changes"
        message="Save or revert your edits before creating or copying a preset."
        confirmLabel="OK"
        cancelLabel="Close"
        onCancel={() => setDirtyAction(null)}
        onConfirm={() => setDirtyAction(null)}
      />

      <ConfirmDialog
        open={editor.blocker.state === 'blocked'}
        title="Unsaved changes"
        message="You have unsaved rules preset edits. Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        danger
        onCancel={() => editor.blocker.reset?.()}
        onConfirm={() => editor.blocker.proceed?.()}
      />
    </AppShell>
  )
}
