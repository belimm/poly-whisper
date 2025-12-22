# Poly-Whisper Architecture Summary

## High-Level Overview

Poly-Whisper is a real-time Twitter monitoring system that analyzes tweets and matches them to relevant Polymarket prediction markets using AI.

## Core Components

### 1. **Data Ingestion**
- **Twitter WebSocket Service**: Connects to Twitter API via WebSocket
- Receives real-time tweets from 25-30 monitored accounts
- Filters out replies and retweets

### 2. **Tweet Analysis**
- **Tweet Analyzer Service**: Uses Google Gemini to analyze tweets
- Extracts: keywords, sentiment, categories, entities, market events
- Falls back to heuristic analysis if LLM unavailable

### 3. **Market Matching**
- **Market Matching Service**: Matches tweets to Polymarket markets
- Uses GPT-4 mini for semantic matching
- Leverages cached market catalog (refreshed every 5 minutes)
- Returns top 5 matches with relevance scores

### 4. **Market Catalog**
- **Market Catalog Service**: Maintains cache of all active markets
- Fetches from Polymarket API every 5 minutes
- Stores in Supabase for persistence
- In-memory cache for fast lookups

### 5. **Data Persistence**
- **Tweet Database Service**: Saves all tweets and analyses
- Stores original analysis (point-in-time)
- Supports refreshed analysis (current state)
- Enables recovery on app restart

### 6. **Analysis Refresh**
- **Analysis Refresh Service**: Re-analyzes stale tweets
- Auto-refresh every 24 hours (configurable)
- On-demand refresh via API
- Preserves original analysis

### 7. **Real-time Communication**
- **Client WebSocket Service**: Broadcasts to frontend clients
- Sends new tweets as they arrive
- System messages and status updates

### 8. **HTTP API**
- REST endpoints for initial page load
- Tweet search and pagination
- Statistics and analytics
- Analysis refresh endpoints

## Data Flow

```
Twitter → Analyze → Match Markets → Save DB → Broadcast → Frontend
   ↓         ↓            ↓            ↓          ↓
 WebSocket  LLM      GPT-4 Mini    Supabase   WebSocket
```

## Database Schema

### `tweets` Table
- Stores tweet details and full enriched object
- Indexed by `created_at` for fast queries

### `tweet_analyses` Table
- Stores LLM analysis results
- Supports both `original` and `refreshed` versions
- Includes matched markets in JSONB

### `market_catalog` Table
- Cached Polymarket markets
- Refreshed every 5 minutes
- Optimized for fast matching

## Key Design Decisions

### 1. **Hybrid Analysis Strategy**
- **Original**: Fast, historical, point-in-time
- **Refreshed**: Accurate, current, up-to-date
- Users can choose which to display

### 2. **Zero-Downtime Refresh**
- Market catalog refresh doesn't block reads
- Old data deleted after new data written
- In-memory cache updated atomically

### 3. **Intelligent Matching**
- LLM-based semantic matching (primary)
- Keyword-based fallback (if LLM unavailable)
- Cached market catalog for performance

### 4. **Dual Communication**
- **HTTP**: Initial load, pagination, search
- **WebSocket**: Real-time updates, new tweets

## API Endpoints

### Tweets
- `GET /api/tweets` - Get tweets (paginated)
- `GET /api/tweets/with-analysis` - Get tweets with analysis
- `GET /api/tweets/latest` - Get latest tweets
- `GET /api/tweets/search?q=keyword` - Search tweets
- `GET /api/tweets/statistics` - Get statistics

### Markets
- `GET /api/markets/catalog/stats` - Catalog statistics
- `POST /api/markets/catalog/refresh` - Manual refresh

### Analysis
- `POST /api/analysis/refresh/:tweetId` - Refresh single tweet
- `POST /api/analysis/refresh-batch` - Refresh multiple tweets
- `POST /api/analysis/refresh-stale` - Auto-refresh stale analyses

## Environment Variables

### Required
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key
- `OPENAI_API_KEY` - For market matching
- `TWITTERAPI_IO_KEY` - Twitter API key

### Optional
- `GEMINI_API_KEY` - For tweet analysis (fallback)
- `MARKET_CATALOG_REFRESH_INTERVAL` - Refresh interval (ms)
- `ANALYSIS_REFRESH_INTERVAL_HOURS` - Auto-refresh interval

## Performance Metrics

- **Market Catalog**: ~1000-2000 markets cached
- **Refresh Time**: 5-30 seconds (depends on market count)
- **Tweet Processing**: 3-8 seconds per tweet (analysis + matching)
- **Database Queries**: <100ms for paginated queries
- **WebSocket Latency**: <10ms per client

## Scalability

- **Horizontal**: Can scale by adding more instances
- **Database**: PostgreSQL handles large volumes efficiently
- **Caching**: In-memory cache reduces database load
- **Rate Limiting**: LLM calls are rate-limited and batched

## Monitoring

- Health check endpoint: `GET /health`
- WebSocket status: `GET /api/websocket/status`
- Market catalog stats: `GET /api/markets/catalog/stats`
- Tweet statistics: `GET /api/tweets/statistics`

