interface StatusMessageProps {
  title: string
  message?: string
  tone?: 'info' | 'error' | 'success'
}

export function StatusMessage({
  message,
  title,
  tone = 'info'
}: StatusMessageProps): JSX.Element {
  return (
    <div className={`status-message ${tone}`}>
      <strong>{title}</strong>
      {message ? <span>{message}</span> : null}
    </div>
  )
}
