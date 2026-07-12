import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { SelectionCard } from '../components/newGame/SelectionCard'
import { ValidationSummary } from '../components/newGame/ValidationSummary'
import { WizardSteps } from '../components/newGame/WizardSteps'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  Panel,
  SectionHeader,
  SegmentedControl,
} from '../components/ui'
import { mapReadiness } from '../catalog/mapFactory'
import { useNewGameWizard } from '../newGame/hooks/useNewGameWizard'
import { GAME_NAME_MAX_LENGTH } from '../newGame/constants'

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

function formatGrowthRate(rate: number): string {
  return `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1)}%`
}

export function NewGamePage() {
  const wizard = useNewGameWizard()
  const { state, actions, selectedMap, selectedPreset } = wizard

  return (
    <AppShell title="New Game">
      <PageHeader
        eyebrow="Setup"
        title="New Game"
        description={
          <>
            Create an independent game session from a map, civilizations, and rules preset.{' '}
            <Link to="/">Main Menu</Link>
          </>
        }
      />

      <WizardSteps
        current={state.step}
        maxReachable={wizard.maxReachable}
        onSelect={(step) => actions.jumpToStep(step)}
      />

      {wizard.status === 'loading' ? (
        <p style={{ color: 'var(--text-tertiary)' }}>Loading catalogs…</p>
      ) : null}

      {wizard.status === 'error' ? (
        <EmptyState
          title="Could not load wizard sources"
          actions={
            <Button variant="secondary" size="md" onClick={() => void actions.refreshSources()}>
              Retry
            </Button>
          }
        >
          <p style={{ margin: 0 }}>{wizard.loadError}</p>
        </EmptyState>
      ) : null}

      {wizard.status === 'ready' && state.step === 1 ? (
        <section className="wizard-panel" aria-labelledby="step-map-title">
          <SectionHeader title="Select Map" />
          <p id="step-map-title" className="visually-hidden">
            Step 1 — Select Map
          </p>
          <div className="catalog-toolbar">
            <div className="catalog-toolbar__search">
              <Input
                aria-label="Search maps"
                placeholder="Search by name or description"
                value={wizard.mapQuery}
                onChange={(e) => actions.setMapQuery(e.target.value)}
              />
            </div>
            <Link to="/library/maps" className="ui-button ui-button--ghost ui-button--md">
              Maps Catalog
            </Link>
          </div>

          {wizard.maps.length === 0 ? (
            <EmptyState
              title="No maps yet"
              actions={
                <Link to="/library/maps?create=1" className="ui-button ui-button--primary ui-button--md">
                  Create a map
                </Link>
              }
            >
              <p style={{ margin: 0 }}>Create a map with cities before starting a game.</p>
            </EmptyState>
          ) : (
            <div className="selection-list" role="listbox" aria-label="Maps">
              {wizard.filteredMaps.map((map) => {
                const readiness = mapReadiness(map)
                const selected = state.mapId === map.id
                return (
                  <SelectionCard
                    key={map.id}
                    selected={selected}
                    title={map.name}
                    description={map.description || undefined}
                    meta={
                      <>
                        {map.width}×{map.height} · {map.cities.length} cities · updated{' '}
                        {formatDate(map.updatedAt)}{' '}
                        <Badge
                          tone={
                            readiness === 'ready' ? 'success' : readiness === 'draft' ? 'warning' : 'neutral'
                          }
                        >
                          {readinessLabel(readiness)}
                        </Badge>
                      </>
                    }
                    onSelect={() => actions.selectMapId(map.id)}
                    actions={
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => actions.requestLeave(`/library/maps/${map.id}/edit`)}
                      >
                        Open in Editor
                      </Button>
                    }
                  />
                )
              })}
            </div>
          )}

          {selectedMap && selectedMap.cities.length === 0 ? (
            <div className="catalog-status-error" role="status">
              This map has no cities. Capitals require cities on the map.{' '}
              <button
                type="button"
                className="wizard-inline-link"
                onClick={() => actions.requestLeave(`/library/maps/${selectedMap.id}/edit`)}
              >
                Edit map
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {wizard.status === 'ready' && state.step === 2 ? (
        <section className="wizard-panel" aria-labelledby="step-civ-title">
          <SectionHeader title="Civilizations & Capitals" />
          <p id="step-civ-title" className="visually-hidden">
            Step 2 — Civilizations
          </p>
          <p className="wizard-hint">
            Exactly one civilization must be Human. Each needs a unique capital from the selected map.
          </p>

          {wizard.civilizations.length === 0 ? (
            <EmptyState
              title="No civilizations in catalog"
              actions={
                <button
                  type="button"
                  className="ui-button ui-button--primary ui-button--md"
                  onClick={() => actions.requestLeave('/library/civilizations')}
                >
                  Open Civilizations
                </button>
              }
            >
              <p style={{ margin: 0 }}>Create civilizations before starting a game.</p>
            </EmptyState>
          ) : (
            <>
              <div className="catalog-toolbar">
                <div className="catalog-toolbar__search">
                  <Input
                    aria-label="Search civilizations"
                    placeholder="Search catalog"
                    value={wizard.civQuery}
                    onChange={(e) => actions.setCivQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="wizard-two-col">
                <Panel title="Available">
                  <div className="selection-list" role="listbox" aria-label="Available civilizations">
                    {wizard.filteredCivs.length === 0 ? (
                      <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>No matches</p>
                    ) : (
                      wizard.filteredCivs.map((civ) => (
                        <div key={civ.id} className="wizard-civ-row">
                          <span aria-hidden="true">{civ.flagEmoji}</span>
                          <span
                            className="catalog-civ__swatch"
                            style={{ background: civ.defaultColor }}
                            aria-hidden="true"
                          />
                          <span>
                            {civ.name}{' '}
                            <span style={{ color: 'var(--text-tertiary)' }}>({civ.cultureName})</span>
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => actions.addCiv(civ.id)}
                          >
                            Add
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>

                <Panel title="In this game">
                  {state.civilizations.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>Add at least one civilization.</p>
                  ) : (
                    <ul className="wizard-selected-civs">
                      {state.civilizations.map((sel) => {
                        const template = wizard.templatesById.get(sel.templateId)
                        if (!template) return null
                        const colorDup =
                          state.civilizations.filter((c) => c.color.toLowerCase() === sel.color.toLowerCase())
                            .length > 1
                        return (
                          <li key={sel.templateId} className="wizard-selected-civ">
                            <div className="wizard-selected-civ__header">
                              <strong>
                                {template.flagEmoji} {template.name}
                              </strong>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => actions.removeCiv(sel.templateId)}
                              >
                                Remove
                              </Button>
                            </div>
                            <SegmentedControl
                              ariaLabel={`Control type for ${template.name}`}
                              size="sm"
                              value={sel.playerType}
                              onChange={(v) =>
                                actions.setPlayerType(sel.templateId, v as 'human' | 'ai')
                              }
                              options={[
                                { value: 'human', label: 'Human' },
                                { value: 'ai', label: 'AI' },
                              ]}
                            />
                            <FormField
                              label="Game color"
                              htmlFor={`color-${sel.templateId}`}
                              hint={colorDup ? 'Another civilization uses this color' : undefined}
                            >
                              <Input
                                id={`color-${sel.templateId}`}
                                type="color"
                                value={sel.color}
                                onChange={(e) => actions.setColor(sel.templateId, e.target.value)}
                              />
                            </FormField>
                            <FormField
                              label="Capital city"
                              htmlFor={`capital-${sel.templateId}`}
                              error={
                                !sel.capitalCityId
                                  ? 'Capital required'
                                  : undefined
                              }
                            >
                              <select
                                id={`capital-${sel.templateId}`}
                                className="ui-input"
                                value={sel.capitalCityId ?? ''}
                                onChange={(e) =>
                                  actions.setCapital(
                                    sel.templateId,
                                    e.target.value ? e.target.value : null,
                                  )
                                }
                                aria-invalid={!sel.capitalCityId}
                              >
                                <option value="">Select capital…</option>
                                {(selectedMap?.cities ?? []).map((city) => {
                                  const usedByOther =
                                    wizard.usedCapitalIds.has(city.id) &&
                                    sel.capitalCityId !== city.id
                                  return (
                                    <option key={city.id} value={city.id} disabled={usedByOther}>
                                      {city.name}
                                      {usedByOther ? ' (assigned)' : ''}
                                    </option>
                                  )
                                })}
                              </select>
                            </FormField>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </Panel>
              </div>
            </>
          )}
        </section>
      ) : null}

      {wizard.status === 'ready' && state.step === 3 ? (
        <section className="wizard-panel" aria-labelledby="step-settings-title">
          <SectionHeader title="Game Settings" />
          <p id="step-settings-title" className="visually-hidden">
            Step 3 — Game Settings
          </p>
          <div className="wizard-settings-grid">
            <FormField label="Rules preset" htmlFor="rules-preset">
              <select
                id="rules-preset"
                className="ui-input"
                value={state.rulesPresetId ?? ''}
                onChange={(e) => actions.setPreset(e.target.value)}
              >
                {wizard.presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>
            <p className="wizard-hint">
              Manage presets in{' '}
              <button
                type="button"
                className="wizard-inline-link"
                onClick={() => actions.requestLeave('/settings')}
              >
                Settings
              </button>
              . The game will snapshot the selected preset.
            </p>

            {selectedPreset ? (
              <Panel title="Preset values (read-only)">
                <dl className="wizard-dl">
                  <div>
                    <dt>Base growth rate</dt>
                    <dd>{formatGrowthRate(selectedPreset.settings.baseGrowthRate)}</dd>
                  </div>
                  <div>
                    <dt>Capital culture / turn</dt>
                    <dd>{selectedPreset.settings.capitalCulturePerTurn}</dd>
                  </div>
                  <div>
                    <dt>Culture annex threshold</dt>
                    <dd>{selectedPreset.settings.cultureAnnexThreshold}</dd>
                  </div>
                </dl>
              </Panel>
            ) : null}

            <FormField label="Starting year" htmlFor="starting-year" hint="Negative = BCE">
              <Input
                id="starting-year"
                type="number"
                step={1}
                value={state.startingYear}
                onChange={(e) => actions.setStartingYear(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Years per turn" htmlFor="years-per-turn">
              <Input
                id="years-per-turn"
                type="number"
                min={1}
                step={1}
                value={state.yearsPerTurn}
                onChange={(e) => actions.setYearsPerTurn(Number(e.target.value))}
              />
            </FormField>
            <FormField
              label="Maximum turns (optional)"
              htmlFor="maximum-turns"
              hint="Leave empty for no turn limit"
            >
              <Input
                id="maximum-turns"
                type="number"
                min={1}
                step={1}
                value={state.maximumTurns ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    actions.setMaximumTurns(null)
                    return
                  }
                  actions.setMaximumTurns(Number(raw))
                }}
              />
            </FormField>
          </div>
        </section>
      ) : null}

      {wizard.status === 'ready' && state.step === 4 ? (
        <section className="wizard-panel" aria-labelledby="step-review-title">
          <SectionHeader title="Review & Start" />
          <p id="step-review-title" className="visually-hidden">
            Step 4 — Review
          </p>

          <FormField
            label="Game name"
            htmlFor="game-name"
            hint={`Max ${GAME_NAME_MAX_LENGTH} characters`}
          >
            <Input
              id="game-name"
              value={state.gameName}
              maxLength={GAME_NAME_MAX_LENGTH}
              onChange={(e) => actions.setGameName(e.target.value)}
            />
          </FormField>

          <Panel title="Summary">
            <dl className="wizard-dl">
              <div>
                <dt>Map</dt>
                <dd>
                  {selectedMap
                    ? `${selectedMap.name} (${selectedMap.width}×${selectedMap.height}, ${selectedMap.cities.length} cities)`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Human</dt>
                <dd>
                  {wizard.humanTemplate
                    ? `${wizard.humanTemplate.flagEmoji} ${wizard.humanTemplate.name}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>AI civilizations</dt>
                <dd>
                  {state.civilizations
                    .filter((c) => c.playerType === 'ai')
                    .map((c) => wizard.templatesById.get(c.templateId)?.name)
                    .filter(Boolean)
                    .join(', ') || 'None'}
                </dd>
              </div>
              <div>
                <dt>Capitals</dt>
                <dd>
                  <ul className="wizard-capitals">
                    {state.civilizations.map((sel) => {
                      const name = wizard.templatesById.get(sel.templateId)?.name ?? sel.templateId
                      const city = selectedMap?.cities.find((c) => c.id === sel.capitalCityId)
                      return (
                        <li key={sel.templateId}>
                          {name} → {city?.name ?? 'unassigned'} ({sel.playerType})
                        </li>
                      )
                    })}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>
                  Start {state.startingYear}, {state.yearsPerTurn} years/turn
                  {state.maximumTurns != null ? `, max ${state.maximumTurns} turns` : ', no turn limit'}
                </dd>
              </div>
              <div>
                <dt>Rules</dt>
                <dd>
                  {selectedPreset
                    ? `${selectedPreset.name} — growth ${formatGrowthRate(selectedPreset.settings.baseGrowthRate)}, culture ${selectedPreset.settings.capitalCulturePerTurn}/turn, annex ${selectedPreset.settings.cultureAnnexThreshold}`
                    : '—'}
                </dd>
              </div>
            </dl>
          </Panel>

          {wizard.saveError ? (
            <div className="catalog-status-error" role="alert">
              {wizard.saveError}
            </div>
          ) : null}
        </section>
      ) : null}

      {wizard.status === 'ready' ? (
        <>
          <ValidationSummary errors={wizard.stepErrors} />
          <div className="wizard-footer">
            <Button
              variant="secondary"
              size="md"
              type="button"
              disabled={state.step <= 1 || wizard.saving}
              onClick={() => actions.goBack()}
            >
              Back
            </Button>
            {state.step < 4 ? (
              <Button
                variant="primary"
                size="md"
                type="button"
                disabled={wizard.currentStepErrors.length > 0}
                title={
                  wizard.currentStepErrors.length
                    ? wizard.currentStepErrors.join('; ')
                    : undefined
                }
                onClick={() => actions.goNext()}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                type="button"
                disabled={wizard.saving || wizard.currentStepErrors.length > 0}
                title={
                  wizard.currentStepErrors.length
                    ? wizard.currentStepErrors.join('; ')
                    : undefined
                }
                onClick={() => void actions.createGame()}
              >
                {wizard.saving ? 'Creating…' : 'Create Game'}
              </Button>
            )}
          </div>
          {state.step < 4 && wizard.currentStepErrors.length > 0 ? (
            <p className="wizard-disabled-hint" id="next-disabled-reason">
              Next is disabled: {wizard.currentStepErrors[0]}
              {wizard.currentStepErrors.length > 1
                ? ` (+${wizard.currentStepErrors.length - 1} more)`
                : ''}
            </p>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={wizard.leaveConfirmOpen}
        title="Leave New Game wizard?"
        message="Your setup progress will be lost. Incomplete games are not saved."
        confirmLabel="Leave"
        cancelLabel="Stay"
        danger
        onConfirm={() => actions.confirmLeave()}
        onCancel={() => actions.cancelLeave()}
      />
    </AppShell>
  )
}
