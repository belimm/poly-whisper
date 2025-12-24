import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { EnrichedTweet } from '@/lib/types'

interface UseTweetsOptions {
  limit?: number
  offset?: number
  autoFetch?: boolean
}

export function useTweets(options: UseTweetsOptions = {}) {
  const { limit = 20, offset = 0, autoFetch = true } = options
  const [tweets, setTweets] = useState<EnrichedTweet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const hasFetchedRef = useRef(false)

  const fetchTweets = async (currentOffset = offset) => {
    try {
      setLoading(true)
      setError(null)

      const data = await api.getTweetsWithAnalysis(limit, currentOffset)

      if (currentOffset === 0) {
        setTweets(data.tweets)
      } else {
        setTweets(prev => [...prev, ...data.tweets])
      }

      setHasMore(data.hasMore)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tweets')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchTweets(tweets.length)
    }
  }

  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchTweets()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    tweets,
    loading,
    error,
    hasMore,
    total,
    fetchTweets,
    loadMore,
    refresh: () => fetchTweets(0),
    setTweets
  }
}


