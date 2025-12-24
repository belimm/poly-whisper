import { useEffect, useRef, useCallback, useState } from 'react'
import { EnrichedTweet } from '@/lib/types'
import { api } from '@/lib/api'

interface Market {
  id: string
  slug: string
  question: string
  image?: string
  icon?: string
  category: string
  categoryLabel: string
  categoryIcon: string
  categoryPriority: number
  yesPrice: number
  noPrice: number
  yesPriceDisplay: string
  noPriceDisplay: string
  probability: number
  outcomes?: Array<{
    name: string
    price: number
    priceDisplay: string
  }>
  volume: number
  volume24h: number
  volume1wk: number
  liquidity: number
  volumeDisplay: string
  volume24hDisplay: string
  liquidityDisplay: string
  priceChange1h: number
  priceChange24h: number
  priceChange1wk: number
  priceChange1mo: number
  bestBid?: number
  bestAsk?: number
  spread?: number
  endDate?: string
  volumeSpike: number
  volatilityScore: number
  hotScore: number
  tags: string[]
  hotReason?: string
  hotReasonConfig?: {
    label: string
    color: string
    textColor: string
  }
}

interface TrendingMarketsData {
  trending: Market[]
  hot: Market[]
  lastUpdated: string
}

interface WebSocketMessage {
  type: 'newTweet' | 'welcome' | 'system' | 'trendingMarketUpdate'
  data?: EnrichedTweet | TrendingMarketsData
  message?: string
  clientId?: string
  timestamp: string
}

interface UseWebSocketOptions {
  onNewTweet?: (tweet: EnrichedTweet) => void
  onTrendingMarketUpdate?: (data: TrendingMarketsData) => void
  enabled?: boolean
}

export function useWebSocket({ onNewTweet, onTrendingMarketUpdate, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const [isConnected, setIsConnected] = useState(false)
  const [trendingMarkets, setTrendingMarkets] = useState<TrendingMarketsData | null>(null)

  const connect = useCallback(() => {
    if (!enabled) return

    const wsBaseUrl = api.getWebSocketURL() || 'ws://localhost:3000'
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
          } else if (message.type === 'newTweet' && message.data) {
            const tweetData = message.data as EnrichedTweet
            console.log('📨 New tweet received via WebSocket:', tweetData.tweetDetails.authorUsername)
            
            if (onNewTweet) {
              onNewTweet(tweetData)
            }
          } else if (message.type === 'trendingMarketUpdate' && message.data) {
            const marketData = message.data as TrendingMarketsData
           
            setTrendingMarkets(marketData)
            if (onTrendingMarketUpdate) {
              onTrendingMarketUpdate(marketData)
            }
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
  }, [enabled, onNewTweet, onTrendingMarketUpdate])

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
    trendingMarkets: trendingMarkets?.trending || [],
    hotMarkets: trendingMarkets?.hot || [],
    lastUpdated: trendingMarkets?.lastUpdated,
  }
}
