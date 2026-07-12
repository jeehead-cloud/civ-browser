interface SegmentedOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  size?: 'sm' | 'md'
}

/** Compact segmented control for editor mode / section navigation. */
export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedControlProps) {
  return (
    <div
      className={`ui-segmented ui-segmented--${size}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          className={`ui-segmented__btn${value === opt.value ? ' ui-segmented__btn--active' : ''}`}
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
