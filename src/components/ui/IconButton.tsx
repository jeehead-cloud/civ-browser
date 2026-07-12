import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function IconButton({ label, className = '', children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={['ui-icon-button', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      {children}
    </button>
  )
}
