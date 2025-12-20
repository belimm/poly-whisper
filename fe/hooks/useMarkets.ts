import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Market } from '@/lib/types'

interface UseMarketsOptions {
  tweetId: string | null
  q?: number
  qc?: number
  autoFetch?: boolean
}

export function useMarkets(options: UseMarketsOptions) {
  const { tweetId, q = 1, qc = 1, autoFetch = true } = options
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMarkets = async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const data = await api.findMarketsForTweet(id, q, qc)
      setMarkets(data.markets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch markets')
      setMarkets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log(tweetId);
    if (autoFetch && tweetId) {
      fetchMarkets(tweetId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tweetId, q, qc, autoFetch])

  return {
    markets,
    loading,
    error,
    fetchMarkets,
    refetch: () => tweetId && fetchMarkets(tweetId)
  }
}
