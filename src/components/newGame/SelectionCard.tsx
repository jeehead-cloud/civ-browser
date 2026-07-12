import type { KeyboardEvent, ReactNode } from 'react'

interface SelectionCardProps {
  selected: boolean
  title: string
  meta?: ReactNode
  description?: string
  disabled?: boolean
  disabledReason?: string
  actions?: ReactNode
  onSelect: () => void
}

/** Keyboard-accessible selectable card — selection is not color-only. */
export function SelectionCard({
  selected,
  title,
  meta,
  description,
  disabled,
  disabledReason,
  actions,
  onSelect,
}: SelectionCardProps) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      className={`selection-card${selected ? ' selection-card--selected' : ''}${
        disabled ? ' selection-card--disabled' : ''
      }`}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onSelect()
      }}
      onKeyDown={onKeyDown}
    >
      <div className="selection-card__body">
        <div className="selection-card__title-row">
          <span className="selection-card__marker" aria-hidden="true">
            {selected ? '✓' : ''}
          </span>
          <h3 className="selection-card__title">{title}</h3>
          {selected ? (
            <span className="selection-card__selected-label">Selected</span>
          ) : null}
        </div>
        {meta ? <div className="selection-card__meta">{meta}</div> : null}
        {description ? <p className="selection-card__desc">{description}</p> : null}
        {disabled && disabledReason ? (
          <p className="selection-card__disabled-reason">{disabledReason}</p>
        ) : null}
      </div>
      {actions ? (
        <div
          className="selection-card__actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}
