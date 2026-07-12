interface ValidationSummaryProps {
  errors: string[]
  title?: string
}

/** Assistive-technology friendly validation list. */
export function ValidationSummary({ errors, title = 'Fix before continuing' }: ValidationSummaryProps) {
  if (errors.length === 0) return null
  return (
    <div className="validation-summary" role="alert" aria-live="polite">
      <p className="validation-summary__title">{title}</p>
      <ul className="validation-summary__list">
        {errors.map((err) => (
          <li key={err}>{err}</li>
        ))}
      </ul>
    </div>
  )
}
