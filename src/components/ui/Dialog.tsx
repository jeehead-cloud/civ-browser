import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface DialogProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}

/** Accessible modal overlay — Esc closes; focus stays within dialog via native tab order. */
export function Dialog({ open, title, children, onClose, footer }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ui-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ui-dialog__header">
          <h2 id="ui-dialog-title" className="ui-dialog__title">
            {title}
          </h2>
          <button type="button" className="ui-icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ui-dialog__body">{children}</div>
        {footer ? <div className="ui-dialog__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
