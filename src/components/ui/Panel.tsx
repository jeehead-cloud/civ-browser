import type { ReactNode } from 'react'

interface PanelProps {
  title?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, actions, children, className = '' }: PanelProps) {
  return (
    <section className={['ui-panel', className].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <header className="ui-panel__header">
          {title ? <h3 className="ui-panel__title">{title}</h3> : <span />}
          {actions}
        </header>
      )}
      <div className="ui-panel__body">{children}</div>
    </section>
  )
}
