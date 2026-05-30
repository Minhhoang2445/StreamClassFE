import { StatusMessage } from '../StatusMessage'

interface ErrorBannerProps {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps): JSX.Element | null {
  if (!message) {
    return null
  }

  return <StatusMessage tone="error" title="Khong vao duoc LiveKit room" message={message} />
}
