import type { RulesParameterDefinition } from '../../rules/parameterDefinitions'
import {
  storageToUiValue,
  uiMax,
  uiMin,
  uiStep,
  uiToStorageValue,
} from '../../rules/parameterDefinitions'
import { Badge, Button, FormField, Input } from '../ui'

interface ParameterFieldProps {
  definition: RulesParameterDefinition
  storageValue: number
  changed: boolean
  error?: string
  disabled?: boolean
  onChange: (storageValue: number) => void
  onReset: () => void
}

export function ParameterField({
  definition,
  storageValue,
  changed,
  error,
  disabled,
  onChange,
  onReset,
}: ParameterFieldProps) {
  const uiValue = storageToUiValue(definition, storageValue)
  const defaultUi = storageToUiValue(definition, definition.defaultValue)

  return (
    <article className={`rules-param-card${changed ? ' rules-param-card--changed' : ''}`}>
      <div className="rules-param-card__header">
        <h3 className="rules-param-card__title">{definition.label}</h3>
        {changed ? <Badge tone="warning">Changed</Badge> : null}
      </div>
      <p className="rules-param-card__desc">{definition.description}</p>
      <FormField
        label={`${definition.label}${definition.inputType === 'percentage' ? ' (%)' : ''}`}
        htmlFor={`param-${definition.key}`}
        error={error}
      >
        <div className="rules-param-card__input-row">
          <Input
            id={`param-${definition.key}`}
            type="number"
            min={uiMin(definition)}
            max={uiMax(definition)}
            step={uiStep(definition)}
            value={Number.isFinite(uiValue) ? uiValue : ''}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              const raw = Number(e.target.value)
              if (!Number.isFinite(raw)) {
                onChange(Number.NaN)
                return
              }
              let storage = uiToStorageValue(definition, raw)
              if (definition.integer) storage = Math.round(storage)
              onChange(storage)
            }}
          />
          <span className="rules-param-card__unit">{definition.unit}</span>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={onReset} type="button">
            Reset field
          </Button>
        </div>
      </FormField>
      <p className="rules-param-card__meta">
        Default: {defaultUi}
        {definition.inputType === 'percentage' ? '%' : ` ${definition.unit}`}
        {' · '}
        Range: {uiMin(definition)}–{uiMax(definition)}
        {definition.inputType === 'percentage' ? '%' : ''}
        {definition.integer ? ' · Whole numbers' : ''}
      </p>
    </article>
  )
}
