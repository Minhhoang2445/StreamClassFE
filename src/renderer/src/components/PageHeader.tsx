import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps): JSX.Element {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="header-actions">{actions}</div> : null}
    </header>
  )
}
