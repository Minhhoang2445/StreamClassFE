import { useCallback, useEffect, useRef, useState } from 'react'
import { Client, StompConfig } from '@stomp/stompjs'
import { apiBaseUrl, refreshTokens } from '../api/httpClient'
import { getAccessToken, getRefreshToken } from '../utils/tokenStorage'

interface UseSessionStompClientOptions {
  enabled?: boolean
}

interface UseSessionStompClientResult {
  client: Client | null
  connected: boolean
  connectVersion: number
  error: Error | null
  disconnect: () => void
}

function getWebSocketUrl(): string {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  const url = new URL(apiBaseUrl)
  const protocol = url.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${url.host}/ws`
}

async function ensureAccessToken(): Promise<string> {
  const accessToken = getAccessToken()

  if (accessToken) {
    return accessToken
  }

  if (getRefreshToken()) {
    const tokens = await refreshTokens()
    return tokens.accessToken
  }

  throw new Error('JWT access token not found')
}

function isAuthStompError(frame: { body?: string; headers?: Record<string, string> }): boolean {
  const message = `${frame.headers?.message ?? ''} ${frame.body ?? ''}`.toLowerCase()
  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('jwt') ||
    message.includes('token')
  )
}

export function useSessionStompClient({
  enabled = true
}: UseSessionStompClientOptions = {}): UseSessionStompClientResult {
  const [client, setClient] = useState<Client | null>(null)
  const [connected, setConnected] = useState(false)
  const [connectVersion, setConnectVersion] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const clientRef = useRef<Client | null>(null)
  const reconnectingRef = useRef(false)

  const disconnect = useCallback((): void => {
    const activeClient = clientRef.current
    clientRef.current = null
    setClient(null)
    setConnected(false)

    if (activeClient?.active) {
      void activeClient.deactivate()
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      disconnect()
      return
    }

    let cancelled = false

    const cleanupClient = async (): Promise<void> => {
      const activeClient = clientRef.current
      clientRef.current = null
      setClient(null)

      if (activeClient?.active) {
        await activeClient.deactivate()
      }

      if (!cancelled) {
        setConnected(false)
      }
    }

    const connectClient = async (): Promise<void> => {
      const token = await ensureAccessToken()
      const wsUrl = getWebSocketUrl()
      let nextClient: Client

      const reconnectWithFreshToken = async (reason: string): Promise<void> => {
        if (reconnectingRef.current || cancelled) {
          return
        }

        reconnectingRef.current = true
        setConnected(false)

        try {
          await cleanupClient()
          await refreshTokens()

          if (!cancelled) {
            await connectClient()
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          setError(new Error(`${reason}: ${errorMessage}`))
        } finally {
          reconnectingRef.current = false
        }
      }

      const config: StompConfig = {
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        reconnectDelay: 5000,
        beforeConnect: async () => {
          const latestToken = await ensureAccessToken()
          nextClient.connectHeaders = {
            Authorization: `Bearer ${latestToken}`
          }
        },
        onConnect: () => {
          if (cancelled) {
            return
          }

          setConnected(true)
          setConnectVersion((value) => value + 1)
          setError(null)
        },
        onStompError: (frame) => {
          console.error('STOMP error:', frame)
          setConnected(false)

          if (isAuthStompError(frame)) {
            void reconnectWithFreshToken('WebSocket authentication failed')
            return
          }

          setError(new Error(`STOMP error: ${frame.body}`))
        },
        onWebSocketClose: (event) => {
          setConnected(false)

          if (event.code === 1008) {
            void reconnectWithFreshToken('WebSocket authentication failed')
          }
        }
      }

      nextClient = new Client(config)
      clientRef.current = nextClient
      setClient(nextClient)
      nextClient.activate()
    }

    connectClient().catch((err) => {
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (!cancelled) {
        setError(new Error(`Failed to connect WebSocket: ${errorMessage}`))
        setConnected(false)
      }
    })

    return () => {
      cancelled = true
      void cleanupClient()
    }
  }, [disconnect, enabled])

  return {
    client,
    connected,
    connectVersion,
    error,
    disconnect
  }
}
