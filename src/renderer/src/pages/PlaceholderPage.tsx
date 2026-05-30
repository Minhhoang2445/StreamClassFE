import { PageHeader } from '../components/PageHeader'
import { StatusMessage } from '../components/StatusMessage'

interface PlaceholderPageProps {
  title: string
  message: string
}

export function PlaceholderPage({ message, title }: PlaceholderPageProps): JSX.Element {
  return (
    <div className="page">
      <PageHeader eyebrow="TODO" title={title} />
      <StatusMessage title="Backend chua ho tro" message={message} />
    </div>
  )
}
