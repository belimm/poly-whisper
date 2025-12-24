# Poly-Whisper Backend (Updated Implementation)

## Overview

This is the updated backend implementation that uses **LLM-based intelligent market matching** instead of keyword-based search. The system now:

1. **Fetches all active markets** from Polymarket API using the new endpoint
2. **Caches markets in Supabase** with automatic refresh every 5 minutes
3. **Uses GPT-4 mini** to intelligently match tweets to relevant markets
4. **Provides comprehensive timing analysis** for performance monitoring

## Key Changes from Original Implementation

### 1. New API Endpoint

-  **Old**: Generic search endpoint with keyword-based queries
-  **New**: `/markets?closed=false&include_tag=true&volume_num_min=10000`
   -  Fetches all active markets in one go
   -  Includes tags for better categorization
   -  Filters by minimum volume ($10k default)

### 2. Market Catalog Service

-  **Refresh Interval**: 5 minutes (configurable via `MARKET_CATALOG_REFRESH_INTERVAL`)
-  **Zero-downtime updates**: Writes new data before deleting old
-  **Comprehensive timing metrics**: Tracks fetch time, write time, cleanup time
-  **Automatic retry logic**: Handles API failures gracefully

### 3. Intelligent Market Matching

-  **LLM-based**: Uses GPT-4 mini for semantic understanding
-  **No per-tweet API calls**: All markets are cached locally
-  **Relevance scoring**: Each match has a confidence score (0-1)
-  **Fallback support**: Falls back to keyword matching if LLM unavailable

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# OpenAI (required for intelligent matching)
OPENAI_API_KEY=sk-...

# Market Catalog Configuration (optional)
MARKET_CATALOG_REFRESH_INTERVAL=300000  # 5 minutes in milliseconds
MARKET_CATALOG_MIN_VOLUME=10000          # Minimum volume in USD
MARKET_CATALOG_MIN_LIQUIDITY=500         # Minimum liquidity in USD

# Matching Configuration (optional)
MAX_MARKETS_PER_TWEET=5                  # Max markets to return per tweet
MIN_RELEVANCE_SCORE=0.5                  # Minimum relevance score (0-1)
```

### 2. Database Migration

Run the migration to create the `market_catalog` table:

```bash
# In Supabase SQL Editor, run:
be/migrations/003_create_market_catalog.sql
```

Or use the existing migration file - it's already compatible.

### 3. Install Dependencies

```bash
cd be-new
npm install
```

### 4. Start the Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

## Architecture

```
┌─────────────────┐
│  Twitter WS     │ → Tweets
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tweet Pipeline │ → Analyzes tweets with LLM
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Intelligent     │ → Matches tweets to markets
│ Market Matcher  │   using GPT-4 mini + Catalog
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Market Catalog  │ → Cached markets from Supabase
│ Service         │   (refreshed every 5 min)
└─────────────────┘
```

## API Endpoints

### Market Catalog Stats

```bash
GET /api/markets/stats
```

Returns catalog statistics including timing metrics.

### Market Catalog Refresh (Manual)

```bash
POST /api/markets/refresh
```

Manually trigger a catalog refresh.

## Performance Metrics

The service tracks:

-  **Fetch Duration**: Time to fetch all markets from Polymarket API
-  **Write Duration**: Time to write markets to Supabase
-  **Cleanup Duration**: Time to delete old markets
-  **Total Refresh Duration**: End-to-end refresh time
-  **Average API Call Time**: Average time per API request
-  **Market Counts**: Total markets fetched, written, deleted

### Timing Analysis

The service logs timing information:

-  ✅ Good: Refresh completes in < 30 seconds
-  ⚠️ Warning: Refresh takes > 30 seconds (consider optimization)

## Configuration

### Refresh Interval

Default: 5 minutes (300,000ms)

To change:

```bash
MARKET_CATALOG_REFRESH_INTERVAL=600000  # 10 minutes
```

### Minimum Volume Filter

Default: $10,000

To change:

```bash
MARKET_CATALOG_MIN_VOLUME=5000  # $5k minimum
```

### Matching Configuration

```bash
MAX_MARKETS_PER_TWEET=10        # Return top 10 matches
MIN_RELEVANCE_SCORE=0.6         # Only matches with 60%+ relevance
```

## Monitoring

Check catalog status:

```javascript
const stats = marketCatalogService.getStats();
console.log(stats);
// {
//   totalMarkets: 1234,
//   lastRefreshDuration: 15234,
//   lastFetchDuration: 8234,
//   lastWriteDuration: 3456,
//   refreshCount: 42,
//   avgApiCallTime: 234,
//   ...
// }
```

## Troubleshooting

### Catalog Not Refreshing

1. Check Supabase connection: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Check API endpoint: Verify Polymarket API is accessible
3. Check logs for error messages

### LLM Matching Not Working

1. Check OpenAI API key: `OPENAI_API_KEY`
2. Verify catalog is ready: `marketCatalogService.isReady()`
3. Check logs for LLM errors

### Slow Refresh Times

1. Check network latency to Polymarket API
2. Consider increasing `MARKET_CATALOG_REFRESH_INTERVAL`
3. Check Supabase connection pool settings

## Migration from Old Implementation

1. **Stop old server**
2. **Update environment variables** (add OpenAI key)
3. **Run database migration** (if not already done)
4. **Start new server**: `cd be-new && npm start`
5. **Monitor first refresh** (should complete in < 30s)

## Files Structure

```
be-new/
├── index.js                              # Main entry point (updated)
├── src/
│   ├── services/
│   │   └── market/
│   │       ├── marketCatalogService.js   # NEW: Updated catalog service
│   │       └── intelligentMarketMatcher.js # LLM-based matching
│   └── infrastructure/
│       ├── database/
│       │   └── supabaseClient.js          # Supabase client
│       └── client/
│           └── llmClient.js               # OpenAI client
└── migrations/
    └── 003_create_market_catalog.sql      # Database schema
```

## Next Steps

1. **Test the implementation**: Run the server and monitor first refresh
2. **Verify timing**: Check that refresh completes in reasonable time
3. **Monitor matching quality**: Review relevance scores and matches
4. **Adjust configuration**: Tune refresh interval and filters as needed
