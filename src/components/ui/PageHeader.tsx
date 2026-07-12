import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: ReactNode
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      {eyebrow ? <p className="ui-page-header__eyebrow">{eyebrow}</p> : null}
      <h1 className="ui-page-header__title">{title}</h1>
      {description ? <div className="ui-page-header__desc">{description}</div> : null}
    </header>
  )
}

interface SectionHeaderProps {
  title: string
  action?: ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="ui-section-header">
      <h2 className="ui-section-header__title">{title}</h2>
      {action}
    </div>
  )
}
