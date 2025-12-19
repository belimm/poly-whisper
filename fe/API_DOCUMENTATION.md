# Frontend API Documentation

This document provides focused documentation for the two main endpoints used in the Poly-Whisper frontend.

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Main Endpoints](#main-endpoints)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Frontend Integration Examples](#frontend-integration-examples)
8. [Environment Variables](#environment-variables)

---

## Overview

The Poly-Whisper backend provides real-time Twitter monitoring with AI analysis and Polymarket correlation. The frontend primarily uses two main endpoints:

1. **`GET /api/tweets/with-analysis`** - Fetch tweets with AI analysis (sentiment, keywords, categories)
2. **`GET /api/tweets/:tweetId/findMarkets`** - Find related Polymarket markets for a specific tweet

All endpoints require Supabase JWT authentication.

---

## Base URL

### Development
```
http://localhost:3000
```

### Production
```
https://poly-whisper.onrender.com
```

**Note:** Use the `NEXT_PUBLIC_API_URL` environment variable in your frontend code.

---

## Authentication

All protected endpoints require a Supabase JWT token in the Authorization header.

### Authentication Flow

1. **User signs in via Supabase** (handled by frontend)
2. **Get JWT token** from Supabase session
3. **Include token in API requests**

### Headers

```typescript
{
  "Authorization": "Bearer <supabase_jwt_token>",
  "Content-Type": "application/json"
}
```

### Getting the Token (Next.js Example)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Get session token
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// Use in API calls
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tweets/with-analysis`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### Token Management

- Tokens expire after 1 hour
- Supabase client automatically refreshes tokens
- Always check session before API calls:

```typescript
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  // Redirect to login or refresh session
  await supabase.auth.refreshSession()
}
```

---

## Main Endpoints

### 1. Get Tweets with Analysis

#### `GET /api/tweets/with-analysis`

Fetches tweets with their AI analysis including sentiment, keywords, and categories. This is the primary endpoint for displaying tweets in the frontend.

**Request:**
```http
GET /api/tweets/with-analysis?limit=10&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional, default: 10) - Number of tweets to return per page
- `offset` (optional, default: 0) - Pagination offset for infinite scroll or pagination

**Response:**
```json
{
  "tweets": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "tweetDetails": {
        "tweetId": "1234567890",
        "authorId": "author123",
        "authorUsername": "elonmusk",
        "authorName": "Elon Musk",
        "userAvatar": "https://pbs.twimg.com/profile_images/...",
        "text": "Bitcoin to the moon! 🚀",
        "createdAt": "2025-01-15T10:00:00.000Z",
        "likeCount": 15000,
        "retweetCount": 3000,
        "replyCount": 500,
        "url": "https://twitter.com/elonmusk/status/1234567890",
        "receivedAtMs": 1705315200000
      },
      "analysis": {
        "sentiment": "positive",
        "sentimentScore": 0.85,
        "keywords": ["bitcoin", "moon", "crypto"],
        "categories": ["cryptocurrency", "finance"],
        "summary": "Positive tweet about Bitcoin reaching new heights"
      },
      "enrichedAt": "2025-01-15T10:00:05.000Z"
    }
  ],
  "total": 150,
  "limit": 10,
  "offset": 0,
  "hasMore": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

**Response Fields:**
- `tweets` - Array of enriched tweets with analysis
- `total` - Total number of tweets available
- `limit` - Number of tweets returned (same as query param)
- `offset` - Current offset (same as query param)
- `hasMore` - Boolean indicating if more tweets are available
- `user` - Current authenticated user info

**Usage Example:**
```typescript
// Fetch first page
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/with-analysis?limit=20&offset=0`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
)

const data = await response.json()
console.log(`Fetched ${data.tweets.length} tweets`)
console.log(`Total available: ${data.total}`)
console.log(`Has more: ${data.hasMore}`)

// Fetch next page
const nextPage = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/with-analysis?limit=20&offset=20`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
)
```

---

### 2. Find Markets for Tweet

#### `GET /api/tweets/:tweetId/findMarkets`

Finds related Polymarket prediction markets for a specific tweet based on its analysis keywords. This endpoint searches Polymarket for markets matching the tweet's betting keywords.

**Request:**
```http
GET /api/tweets/123e4567-e89b-12d3-a456-426614174000/findMarkets
Authorization: Bearer <token>
```

**Path Parameters:**
- `tweetId` (required) - Database ID of the tweet (UUID format)

**Response:**
```json
{
  "success": true,
  "tweetId": "123e4567-e89b-12d3-a456-426614174000",
  "keywords": ["bitcoin", "price", "crypto"],
  "markets": [
    {
      "id": "0x1234567890abcdef",
      "question": "Will Bitcoin reach $100,000 by end of 2025?",
      "slug": "bitcoin-100k-2025",
      "probability": 0.68,
      "volume": 1234567,
      "liquidity": 50000,
      "bestBid": 0.67,
      "bestAsk": 0.69,
      "lastTradePrice": 0.68,
      "updatedAt": "2025-01-15T14:30:00.000Z"
    },
    {
      "id": "0xabcdef1234567890",
      "question": "Will Bitcoin price exceed $90k in Q1 2025?",
      "slug": "bitcoin-90k-q1-2025",
      "probability": 0.72,
      "volume": 987654,
      "liquidity": 35000,
      "bestBid": 0.71,
      "bestAsk": 0.73,
      "lastTradePrice": 0.72,
      "updatedAt": "2025-01-15T14:25:00.000Z"
    }
  ],
  "marketCount": 2,
  "marketsByKeyword": {
    "bitcoin": [
      {
        "id": "0x1234567890abcdef",
        "question": "Will Bitcoin reach $100,000 by end of 2025?",
        ...
      }
    ],
    "price": [],
    "crypto": [
      {
        "id": "0xabcdef1234567890",
        "question": "Will Bitcoin price exceed $90k in Q1 2025?",
        ...
      }
    ]
  }
}
```

**Response Fields:**
- `success` - Boolean indicating if the request was successful
- `tweetId` - The tweet ID that was queried
- `keywords` - Array of keywords extracted from tweet analysis
- `markets` - Array of all unique markets found (deduplicated)
- `marketCount` - Total number of unique markets
- `marketsByKeyword` - Object mapping each keyword to its matching markets

**Market Object Fields:**
- `id` - Polymarket market ID (contract address)
- `question` - Market question/title
- `slug` - URL-friendly identifier
- `probability` - Current probability (0.0 to 1.0)
- `volume` - Total trading volume
- `liquidity` - Available liquidity
- `bestBid` - Best bid price (0.0 to 1.0)
- `bestAsk` - Best ask price (0.0 to 1.0)
- `lastTradePrice` - Last trade price (0.0 to 1.0)
- `updatedAt` - Last update timestamp

**Usage Example:**
```typescript
// First, get tweets with analysis
const tweetsResponse = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/with-analysis?limit=10`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
)

const { tweets } = await tweetsResponse.json()

// For each tweet, find related markets
for (const tweet of tweets) {
  const marketsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/${tweet.id}/findMarkets`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const marketsData = await marketsResponse.json()
  
  if (marketsData.success && marketsData.markets.length > 0) {
    console.log(`Found ${marketsData.marketCount} markets for tweet ${tweet.id}`)
    console.log('Markets:', marketsData.markets)
  }
}
```

**Error Response (404 - Tweet not found):**
```json
{
  "success": false,
  "error": "Tweet not found",
  "message": "Tweet with given ID not found"
}
```

**Error Response (500 - Server error):**
```json
{
  "success": false,
  "error": "Failed to find markets",
  "message": "Error details here"
}
```

**Empty Keywords Response:**
If a tweet has no keywords in its analysis, the endpoint returns:
```json
{
  "success": true,
  "tweetId": "123e4567-e89b-12d3-a456-426614174000",
  "keywords": [],
  "markets": [],
  "marketCount": 0,
  "marketsByKeyword": {},
  "message": "No keywords found in tweet analysis"
}
```

---

## Data Models

### EnrichedTweet

Complete tweet structure returned by `/api/tweets/with-analysis`:

```typescript
interface EnrichedTweet {
  id: string // Database UUID
  tweetDetails: {
    tweetId: string // Twitter tweet ID
    authorId: string
    authorUsername: string
    authorName: string
    userAvatar: string
    text: string
    createdAt: string // ISO timestamp
    likeCount: number
    retweetCount: number
    replyCount: number
    url: string
    receivedAtMs: number
  }
  analysis: {
    sentiment: 'positive' | 'negative' | 'neutral'
    sentimentScore: number // -1.0 to 1.0
    keywords: string[] // Extracted betting keywords
    categories: string[] // Topic categories
    summary: string // AI-generated summary
  }
  enrichedAt: string // ISO timestamp
}
```

### Market

Polymarket market structure returned by `/api/tweets/:tweetId/findMarkets`:

```typescript
interface Market {
  id: string // Polymarket contract address
  question: string // Market question/title
  slug: string // URL-friendly identifier
  probability: number // 0.0 to 1.0
  volume: number // Total trading volume
  liquidity: number // Available liquidity
  bestBid: number // 0.0 to 1.0
  bestAsk: number // 0.0 to 1.0
  lastTradePrice: number // 0.0 to 1.0
  updatedAt: string // ISO timestamp
}
```

### MarketsResponse

Response structure from `/api/tweets/:tweetId/findMarkets`:

```typescript
interface MarketsResponse {
  success: boolean
  tweetId: string
  keywords: string[]
  markets: Market[]
  marketCount: number
  marketsByKeyword: {
    [keyword: string]: Market[]
  }
  message?: string // Present when no keywords found
}
```

### TweetsResponse

Response structure from `/api/tweets/with-analysis`:

```typescript
interface TweetsResponse {
  tweets: EnrichedTweet[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  user: {
    id: string
    email: string
  }
}
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (tweet not found)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common Error Scenarios

#### 1. Unauthorized (401)

**Cause:** Missing or invalid JWT token

**Response:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header"
}
```

**Solution:**
```typescript
// Check if session exists and is valid
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  // Redirect to login or refresh session
  await supabase.auth.refreshSession()
}
```

#### 2. Tweet Not Found (404)

**Cause:** Invalid tweet ID or tweet doesn't exist

**Response:**
```json
{
  "success": false,
  "error": "Tweet not found",
  "message": "Tweet with given ID not found"
}
```

**Solution:**
```typescript
// Always check if tweet exists before calling findMarkets
if (tweet && tweet.id) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/${tweet.id}/findMarkets`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  
  if (response.status === 404) {
    console.log('Tweet not found')
    return
  }
}
```

#### 3. Server Error (500)

**Cause:** Backend error or database issue

**Response:**
```json
{
  "error": "Failed to fetch tweets with analysis",
  "message": "Database connection error"
}
```

**Solution:**
```typescript
// Implement retry logic
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
      if (response.status !== 500) throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

---

## Frontend Integration Examples

### React Hook for Fetching Tweets

```typescript
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

  const fetchTweets = async (currentOffset = offset) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/with-analysis?limit=${limit}&offset=${currentOffset}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed')
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data: TweetsResponse = await response.json()
      
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
    if (autoFetch) {
      fetchTweets()
    }
  }, [limit])

  return {
    tweets,
    loading,
    error,
    hasMore,
    total,
    fetchTweets,
    loadMore,
    refresh: () => fetchTweets(0)
  }
}
```

**Usage:**
```typescript
function TweetsList() {
  const { tweets, loading, error, hasMore, loadMore } = useTweets({ limit: 20 })

  if (loading && tweets.length === 0) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {tweets.map(tweet => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  )
}
```

---

### React Hook for Finding Markets

```typescript
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useFindMarkets() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const findMarkets = async (tweetId: string): Promise<MarketsResponse | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/${tweetId}/findMarkets`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tweet not found')
        }
        if (response.status === 401) {
          throw new Error('Authentication failed')
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data: MarketsResponse = await response.json()
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
```

**Usage:**
```typescript
function TweetCard({ tweet }: { tweet: EnrichedTweet }) {
  const { findMarkets, loading, error } = useFindMarkets()
  const [markets, setMarkets] = useState<Market[]>([])
  const [showMarkets, setShowMarkets] = useState(false)

  const handleFindMarkets = async () => {
    const result = await findMarkets(tweet.id)
    if (result && result.success) {
      setMarkets(result.markets)
      setShowMarkets(true)
    }
  }

  return (
    <div>
      <h3>{tweet.tweetDetails.authorName}</h3>
      <p>{tweet.tweetDetails.text}</p>
      <div>
        <span>Sentiment: {tweet.analysis.sentiment}</span>
        <div>
          Keywords: {tweet.analysis.keywords.join(', ')}
        </div>
      </div>
      
      <button onClick={handleFindMarkets} disabled={loading}>
        {loading ? 'Finding Markets...' : 'Find Related Markets'}
      </button>

      {error && <div>Error: {error}</div>}

      {showMarkets && markets.length > 0 && (
        <div>
          <h4>Related Markets ({markets.length})</h4>
          {markets.map(market => (
            <div key={market.id}>
              <h5>{market.question}</h5>
              <p>Probability: {(market.probability * 100).toFixed(1)}%</p>
              <p>Volume: ${market.volume.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {showMarkets && markets.length === 0 && (
        <div>No related markets found</div>
      )}
    </div>
  )
}
```

---

### Complete Example: Tweet List with Markets

```typescript
'use client'

import { useState } from 'react'
import { useTweets } from '@/hooks/useTweets'
import { useFindMarkets } from '@/hooks/useFindMarkets'

export default function TweetsPage() {
  const { tweets, loading, error, hasMore, loadMore } = useTweets({ limit: 20 })
  const [selectedTweetId, setSelectedTweetId] = useState<string | null>(null)
  const [marketsCache, setMarketsCache] = useState<Record<string, Market[]>>({})

  const { findMarkets, loading: marketsLoading } = useFindMarkets()

  const handleShowMarkets = async (tweetId: string) => {
    if (marketsCache[tweetId]) {
      setSelectedTweetId(tweetId)
      return
    }

    const result = await findMarkets(tweetId)
    if (result && result.success) {
      setMarketsCache(prev => ({
        ...prev,
        [tweetId]: result.markets
      }))
      setSelectedTweetId(tweetId)
    }
  }

  if (loading && tweets.length === 0) {
    return <div>Loading tweets...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tweets with Analysis</h1>

      <div className="space-y-4">
        {tweets.map(tweet => (
          <div key={tweet.id} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <img
                src={tweet.tweetDetails.userAvatar}
                alt={tweet.tweetDetails.authorName}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h3 className="font-semibold">{tweet.tweetDetails.authorName}</h3>
                <p className="text-sm text-gray-500">@{tweet.tweetDetails.authorUsername}</p>
              </div>
            </div>

            <p className="mb-2">{tweet.tweetDetails.text}</p>

            <div className="flex gap-4 text-sm mb-2">
              <span>❤️ {tweet.tweetDetails.likeCount}</span>
              <span>🔄 {tweet.tweetDetails.retweetCount}</span>
              <span>💬 {tweet.tweetDetails.replyCount}</span>
            </div>

            <div className="mb-2">
              <span className={`px-2 py-1 rounded text-sm ${
                tweet.analysis.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                tweet.analysis.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {tweet.analysis.sentiment}
              </span>
              <div className="mt-1">
                <span className="text-xs text-gray-600">Keywords: </span>
                {tweet.analysis.keywords.map(kw => (
                  <span key={kw} className="text-xs bg-blue-100 px-1 rounded mr-1">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleShowMarkets(tweet.id)}
              disabled={marketsLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {marketsLoading && selectedTweetId === tweet.id
                ? 'Finding Markets...'
                : 'Find Related Markets'}
            </button>

            {selectedTweetId === tweet.id && marketsCache[tweet.id] && (
              <div className="mt-4 border-t pt-4">
                <h4 className="font-semibold mb-2">
                  Related Markets ({marketsCache[tweet.id].length})
                </h4>
                {marketsCache[tweet.id].length > 0 ? (
                  <div className="space-y-2">
                    {marketsCache[tweet.id].map(market => (
                      <div key={market.id} className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium">{market.question}</h5>
                        <div className="text-sm text-gray-600 mt-1">
                          <span>Probability: {(market.probability * 100).toFixed(1)}%</span>
                          <span className="ml-4">Volume: ${market.volume.toLocaleString()}</span>
                        </div>
                        <a
                          href={`https://polymarket.com/event/${market.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 text-sm hover:underline"
                        >
                          View on Polymarket →
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No related markets found</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          className="mt-4 px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Load More
        </button>
      )}
    </div>
  )
}
```

---

### API Client Utility Class

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

class PolyWhisperAPI {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Fetch tweets with AI analysis
   */
  async getTweetsWithAnalysis(limit = 20, offset = 0): Promise<TweetsResponse> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/with-analysis?limit=${limit}&offset=${offset}`,
      { headers }
    )
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed')
      }
      throw new Error(`HTTP ${response.status}`)
    }
    
    return response.json()
  }

  /**
   * Find Polymarket markets for a specific tweet
   */
  async findMarketsForTweet(tweetId: string): Promise<MarketsResponse> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/${tweetId}/findMarkets`,
      { headers }
    )
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Tweet not found')
      }
      if (response.status === 401) {
        throw new Error('Authentication failed')
      }
      throw new Error(`HTTP ${response.status}`)
    }
    
    return response.json()
  }
}

export const api = new PolyWhisperAPI()
```

**Usage:**
```typescript
import { api } from '@/lib/api'

// Fetch tweets
const { tweets, total, hasMore } = await api.getTweetsWithAnalysis(20, 0)

// Find markets for a tweet
const marketsData = await api.findMarketsForTweet(tweet.id)
if (marketsData.success) {
  console.log(`Found ${marketsData.marketCount} markets`)
}
```

---

## Environment Variables

### Frontend (.env.local)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ryuihsruolyygfsunqod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API URLs
NEXT_PUBLIC_API_URL=https://poly-whisper.onrender.com

# For local development, use:
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Environment-Specific Configuration

**Development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Production:**
```env
NEXT_PUBLIC_API_URL=https://poly-whisper.onrender.com
```

---

## Best Practices

1. **Always check authentication** before making API calls
2. **Handle token expiration** - Implement automatic token refresh
3. **Implement loading states** for better UX
4. **Cache market results** - Don't refetch markets for the same tweet
5. **Use pagination** - Fetch tweets in batches, not all at once
6. **Handle errors gracefully** - Show user-friendly error messages
7. **Implement retry logic** for failed requests
8. **Use TypeScript** for type safety
9. **Debounce market searches** if triggered by user interaction
10. **Show empty states** when no tweets or markets are found

---

## Common Patterns

### Infinite Scroll Pattern

```typescript
const { tweets, loading, hasMore, loadMore } = useTweets({ limit: 20 })

useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000
      && hasMore
      && !loading
    ) {
      loadMore()
    }
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [hasMore, loading, loadMore])
```

### Market Caching Pattern

```typescript
const [marketsCache, setMarketsCache] = useState<Record<string, Market[]>>({})

const getMarkets = async (tweetId: string) => {
  if (marketsCache[tweetId]) {
    return marketsCache[tweetId]
  }

  const result = await findMarkets(tweetId)
  if (result?.success) {
    setMarketsCache(prev => ({ ...prev, [tweetId]: result.markets }))
    return result.markets
  }
  return []
}
```

---

## Support

For issues or questions:
- Check backend logs for detailed error messages
- Verify Supabase authentication is working
- Ensure environment variables are set correctly
- Review the backend README.md for additional context

---

**Last Updated:** January 2025
