import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, hint, error, children }: FormFieldProps) {
  return (
    <div className="ui-form-field">
      <label className="ui-form-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="ui-form-field__hint">{hint}</p> : null}
      {error ? (
        <p className="ui-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
