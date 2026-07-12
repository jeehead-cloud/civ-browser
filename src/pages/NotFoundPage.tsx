import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { EmptyState, PageHeader } from '../components/ui'

export function NotFoundPage() {
  return (
    <AppShell title="Not found">
      <PageHeader eyebrow="Error" title="Page not found" description="This URL does not match any Civ Browser screen." />
      <EmptyState
        title="Unknown route"
        actions={
          <Link to="/" className="ui-button ui-button--primary ui-button--md">
            Back to Main Menu
          </Link>
        }
      >
        Check the address or return to the command deck.
      </EmptyState>
    </AppShell>
  )
}
