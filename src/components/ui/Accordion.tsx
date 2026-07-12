import type { ReactNode } from 'react'

interface AccordionProps {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  badge?: string
}

/** Compact collapsible group for World Editor tile tools. */
export function Accordion({ title, open, onToggle, children, badge }: AccordionProps) {
  return (
    <div className={`ui-accordion${open ? ' ui-accordion--open' : ''}`}>
      <button
        type="button"
        className="ui-accordion__header"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="ui-accordion__title">{title}</span>
        {badge ? <span className="ui-accordion__badge">{badge}</span> : null}
        <span className="ui-accordion__chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? <div className="ui-accordion__body">{children}</div> : null}
    </div>
  )
}
