interface ConnectionStatusProps {
  status: string
}

export function ConnectionStatus({ status }: ConnectionStatusProps): JSX.Element | null {
  if (!status) {
    return null
  }

  return <div className="connection-pill">{status}</div>
}
