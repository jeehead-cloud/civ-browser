import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  children: ReactNode
  milestone?: string
  actions?: ReactNode
}

export function EmptyState({ title, children, milestone, actions }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <h3 className="ui-empty-state__title">{title}</h3>
      <div className="ui-empty-state__body">{children}</div>
      {actions}
      {milestone ? <p className="ui-empty-state__meta">Deferred · {milestone}</p> : null}
    </div>
  )
}
