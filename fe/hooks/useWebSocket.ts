import { useEffect, useRef, useCallback, useState } from 'react'
import { EnrichedTweet } from '@/lib/types'

interface WebSocketMessage {
  type: 'newTweet' | 'welcome' | 'system'
  data?: EnrichedTweet
  message?: string
  clientId?: string
  timestamp: string
}

interface UseWebSocketOptions {
  onNewTweet?: (tweet: EnrichedTweet) => void
  enabled?: boolean
}

export function useWebSocket({ onNewTweet, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(() => {
    if (!enabled) return

    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
    const wsUrl = `${wsBaseUrl}/ws`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
        reconnectAttempts.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)

          if (message.type === 'welcome') {
            console.log('🎉 WebSocket welcome:', message)
          } else if (message.type === 'newTweet' && message.data && onNewTweet) {
            console.log('📨 New tweet received via WebSocket:', message.data.tweetDetails.authorUsername)

           
            console.log(message.data);
            onNewTweet(message.data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected')
        setIsConnected(false)
        wsRef.current = null

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }, [enabled, onNewTweet])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    reconnect: connect,
  }
}
