# Tweet Processing Flow

## Overview

This document explains how tweets are analyzed, matched to markets, stored, and delivered to the frontend.

## Architecture

```
Twitter WebSocket → Tweet Analyzer → Market Matcher → Database → WebSocket Broadcast
                                                          ↓
                                                    HTTP API (for initial load)
```

## Flow Steps

### 1. **Tweet Reception** (Twitter WebSocket)
- Tweets arrive via `TwitterWebSocketService`
- Filters out replies and retweets
- Emits `tweet` event with `TweetDetails`

### 2. **Tweet Analysis** (LLM)
- `TweetAnalyzer.analyzeWithLLM()` processes tweet text
- Uses Google Gemini API (or OpenAI) to extract:
  - **Keywords**: Market-relevant terms (e.g., "Bitcoin", "Tesla", "2024 election")
  - **Categories**: Classification (e.g., "crypto", "finance", "politics")
  - **Sentiment**: Positive, negative, or neutral
  - **Sentiment Score**: Confidence level (0-1)
  - **Summary**: Brief description
  - **Financial Instruments**: Ticker symbols
  - **Key Entities**: Important people/companies
  - **Market Events**: Specific events (e.g., "Q4 earnings")

### 3. **Market Matching** (Intelligent Matcher)
- `MarketMatchingService.matchTweet()` finds relevant Polymarket markets
- Uses **GPT-4 mini** to semantically match tweet to markets
- Leverages cached `market_catalog` (refreshed every 5 minutes)
- Returns top matches with relevance scores (0-1)
- Falls back to keyword-based search if LLM unavailable

### 4. **Database Persistence**
- **Saves tweet** to `tweets` table:
  - Tweet details (text, author, timestamps, etc.)
  - Full enriched object in `raw_data` JSONB
- **Saves analysis** to `tweet_analyses` table:
  - Sentiment, keywords, categories
  - Full LLM response in `raw_analysis` JSONB
- **Why persist?**
  - Recovery if app crashes
  - Historical data access
  - Analytics and reporting

### 5. **In-Memory Cache**
- Stores latest 1000 tweets in memory
- Used for quick access and real-time operations
- Automatically pruned when limit exceeded

### 6. **WebSocket Broadcast**
- `ClientWebSocketService.broadcastTweet()` sends to all connected clients
- Real-time updates without polling
- Includes full enriched tweet with markets

## Frontend Integration

### Initial Load (HTTP)
```typescript
// GET /api/tweets/with-analysis?limit=50&offset=0
// Returns tweets from database
{
  tweets: EnrichedTweet[],
  total: number,
  limit: number,
  offset: number,
  hasMore: boolean
}
```

### Real-Time Updates (WebSocket)
```typescript
// WebSocket message type: 'newTweet'
{
  type: 'newTweet',
  data: EnrichedTweet
}
```

### Pattern
1. **Page Load**: Fetch initial tweets via HTTP (`GET /api/tweets/with-analysis`)
2. **WebSocket Connection**: Connect to `ws://localhost:3000/ws`
3. **Real-Time**: Receive new tweets via WebSocket as they arrive
4. **Pagination**: Use HTTP for loading more historical tweets

## API Endpoints

### `GET /api/tweets`
- Get latest tweets (from database)
- Query params: `limit`, `offset`

### `GET /api/tweets/with-analysis`
- Get tweets with analysis (from database)
- Query params: `limit`, `offset`
- **Recommended for initial page load**

### `GET /api/tweets/latest`
- Get latest N tweets (database with memory fallback)
- Query params: `limit`

### `GET /api/tweets/search?q=keyword`
- Search tweets by keyword
- Returns matching tweets from database

### `GET /api/tweets/statistics`
- Get tweet statistics
- Returns total tweets and analyses count

## Database Schema

### `tweets` Table
- Stores tweet details and full enriched object
- Indexed by `created_at` (DESC) for fast queries
- Unique constraint on `tweet_id` (prevents duplicates)

### `tweet_analyses` Table
- Stores LLM analysis results
- Linked to `tweets` via foreign key
- Indexed by `tweet_id` for fast lookups

### `tweets_with_analysis` View
- Combines tweets with their analyses
- Simplifies querying enriched tweets
- Used by `getTweetsWithAnalyses()`

## Error Handling

- **Analysis fails**: Falls back to heuristic analysis
- **Market matching fails**: Tweet saved without markets
- **Database save fails**: Tweet still broadcast (logged as warning)
- **WebSocket broadcast fails**: Logged but doesn't block processing

## Performance

- **Analysis**: ~1-3 seconds per tweet (LLM API call)
- **Market Matching**: ~2-5 seconds per tweet (LLM + catalog search)
- **Database Write**: ~50-100ms per tweet
- **WebSocket Broadcast**: <10ms per client

## Recovery

If the application crashes:
1. On restart, tweets are loaded from database
2. HTTP endpoints serve from database (not memory)
3. WebSocket continues broadcasting new tweets
4. No data loss (all tweets persisted)

## Configuration

Environment variables:
- `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`: For tweet analysis
- `OPENAI_API_KEY`: For market matching (GPT-4 mini)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Database connection

