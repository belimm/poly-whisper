import { useState } from 'react'
import { api } from '@/lib/api'
import { MarketsResponse } from '@/lib/types'

export function useFindMarkets() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const findMarkets = async (tweetId: string): Promise<MarketsResponse | null> => {
    try {
      setLoading(true)
      setError(null)

      const data = await api.findMarketsForTweet(tweetId)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find markets')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { findMarkets, loading, error }
}


