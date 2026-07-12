import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={['ui-card', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  )
}

interface CardLinkProps {
  to: string
  children: ReactNode
  className?: string
}

export function CardLink({ to, children, className = '' }: CardLinkProps) {
  return (
    <Link to={to} className={['ui-card', 'ui-card--interactive', className].filter(Boolean).join(' ')}>
      {children}
    </Link>
  )
}
