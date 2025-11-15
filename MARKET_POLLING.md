# Real-Time Market Polling System

## Overview

The Market Polling System provides real-time Polymarket value updates for tweets with analysis keywords. Instead of making API calls from multiple frontend clients (which would cause rate limiting), the backend polls Polymarket every 2-3 seconds and broadcasts updates to all connected WebSocket clients.

## Architecture

### Components

1. **MarketCacheService** - In-memory cache with TTL
   - Stores market search results temporarily
   - Reduces redundant API calls
   - Configurable TTL (default: 5 minutes)

2. **MarketMatchingService** - Keyword-to-market mapping
   - Matches tweet analysis keywords with Polymarket markets
   - Uses cache to avoid duplicate searches
   - Handles batch keyword lookups efficiently

3. **PolymarketPoller** - Polling orchestrator
   - Runs on configurable interval (default: 3 seconds)
   - Fetches latest 10 tweets with keywords from database
   - Searches markets for each keyword
   - Broadcasts updates via WebSocket
   - Manages polling state and statistics

### Data Flow

```
┌─────────────────────────────────────┐
│  PolymarketPoller (Every 2-3 sec)  │
└─────────────────┬───────────────────┘
                  │
        ┌─────────▼─────────┐
        │ Fetch Recent Tweets│
        │ with Keywords      │
        └─────────┬─────────┘
                  │
        ┌─────────▼──────────────────┐
        │ Extract Unique Keywords    │
        │ (de-duplicated set)        │
        └─────────┬──────────────────┘
                  │
        ┌─────────▼──────────────────────┐
        │ Check Cache for Markets        │
        │ Search Polymarket for misses   │
        └─────────┬──────────────────────┘
                  │
        ┌─────────▼──────────────────┐
        │ Cache Results (5 min TTL)  │
        └─────────┬──────────────────┘
                  │
        ┌─────────▼──────────────────────┐
        │ Build Market Update Payload    │
        │ {type: 'marketUpdate', ...}    │
        └─────────┬──────────────────────┘
                  │
        ┌─────────▼──────────────────┐
        │ Broadcast via WebSocket    │
        │ to All Connected Clients   │
        └────────────────────────────┘
```

## Configuration

Add these environment variables to your `.env` file:

```env
# Market Polling Configuration
POLLING_INTERVAL=3000                    # Polling interval in ms (default: 3000ms = 3 sec)
POLLS_TWEETS_LIMIT=10                   # Number of recent tweets to fetch (default: 10)
MARKET_CACHE_TTL=300000                 # Cache TTL in ms (default: 300000ms = 5 min)
MAX_MARKETS_PER_KEYWORD=5               # Max markets to fetch per keyword (default: 5)
POLLING_RETRY_ATTEMPTS=3                # Retry attempts on failure (default: 3)
POLLING_RETRY_DELAY=1000                # Delay between retries in ms (default: 1000ms)
```

### Configuration Recommendations

**Development:**
```env
POLLING_INTERVAL=5000           # 5 sec - reasonable for testing
MARKET_CACHE_TTL=300000         # 5 min
POLLS_TWEETS_LIMIT=10
```

**Production:**
```env
POLLING_INTERVAL=3000           # 3 sec - optimal balance
MARKET_CACHE_TTL=600000         # 10 min - longer cache
POLLS_TWEETS_LIMIT=10
MAX_MARKETS_PER_KEYWORD=3       # Fewer markets to reduce API calls
```

**High-Volume (Many Connected Users):**
```env
POLLING_INTERVAL=5000           # 5 sec - reduce API load
MARKET_CACHE_TTL=900000         # 15 min - aggressive caching
POLLS_TWEETS_LIMIT=5            # Fewer tweets
MAX_MARKETS_PER_KEYWORD=2       # Minimal markets per keyword
```

## WebSocket Message Format

### Market Update Message

The poller broadcasts market updates with this structure:

```json
{
  "type": "marketUpdate",
  "timestamp": "2025-11-15T14:30:00.000Z",
  "pollCycle": 42,
  "tweets": [
    {
      "tweetId": "1234567890",
      "tweetText": "Bitcoin reaching new heights!",
      "keywords": ["bitcoin", "price"],
      "sentiment": "positive",
      "sentimentScore": 0.85,
      "markets": {
        "bitcoin": [
          {
            "id": "market-123",
            "question": "Will Bitcoin reach $100k in 2025?",
            "slug": "bitcoin-100k-2025",
            "probability": 0.68,
            "volume": 1234567,
            "liquidity": 50000,
            "bestBid": 0.67,
            "bestAsk": 0.69,
            "lastTradePrice": 0.68,
            "updatedAt": "2025-11-15T14:30:00.000Z"
          }
        ],
        "price": []
      }
    }
  ],
  "summary": {
    "tweetsProcessed": 1,
    "marketsFound": 1,
    "cacheStats": {
      "totalCached": 5,
      "activeCached": 4,
      "cacheKeys": ["bitcoin", "eth", "crypto"]
    }
  }
}
```

### Frontend WebSocket Handler Example

```typescript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'marketUpdate') {
    // Update market display with fresh data
    message.tweets.forEach(tweet => {
      Object.entries(tweet.markets).forEach(([keyword, markets]) => {
        if (markets.length > 0) {
          updateMarketDisplay(keyword, markets);
        }
      });
    });

    // Log cache efficiency
    console.log('Cache stats:', message.summary.cacheStats);
  }
});
```

## API Efficiency

### Reducing API Calls

The system reduces Polymarket API calls through:

1. **Keyword De-duplication**
   - Extracts unique keywords from all 10 tweets
   - Typical: 10 tweets → 3-5 unique keywords

2. **Caching**
   - Cache hits: No API call needed
   - Default 5-minute TTL means each keyword searched ~once per 5 min
   - Example: 5 keywords × 2 (fresh keywords) / 5 min = ~2 searches/min

3. **Batch Processing**
   - Single poll cycle handles all tweets at once
   - 1 search per unique keyword, not per tweet

4. **Interval Optimization**
   - 3-second interval: ~20 polls/minute
   - With caching: ~2-4 actual API calls/minute average
   - **Result: 10-20x reduction vs. 10 frontend clients polling independently**

### Cost Comparison

**Without Backend Polling (Frontend Approach):**
- 10 users × each polling markets every 2-3 sec
- ~200-300 API calls/minute
- ❌ Hits rate limits, unreliable

**With Backend Polling:**
- 1 backend polling every 3 sec
- ~2-4 API calls/minute with caching
- ✅ Efficient, reliable, scalable

## Monitoring & Diagnostics

### Check Poller Status

```javascript
// In frontend: Request poller status
ws.send(JSON.stringify({
  type: 'getPollerStatus'
}));
```

### View Poller Statistics

The poller tracks:
- Total polls executed
- Successful vs. failed polls
- Last poll duration
- Cache hit/miss ratio
- Active cached keywords

Access via:
```javascript
const status = polymarketPoller.getStatus();
// {
//   isRunning: true,
//   pollingInterval: 3000,
//   stats: {
//     totalPolls: 42,
//     successfulPolls: 40,
//     failedPolls: 2,
//     lastPollDuration: 245
//   },
//   cacheStats: {...}
// }
```

### Manual Operations

**Force Immediate Poll:**
```javascript
await polymarketPoller.forcePoll();
```

**Change Polling Interval:**
```javascript
polymarketPoller.setPollingInterval(5000); // 5 seconds
```

**Clear Cache:**
```javascript
polymarketPoller.marketMatcher.clearAllCache();
```

## Error Handling

The poller includes:

1. **Automatic Retries** (configurable)
   - Retry failed polls up to 3 times
   - Exponential backoff between retries

2. **Graceful Degradation**
   - Failed keyword searches don't crash the poll
   - Returns empty markets array for failed keywords

3. **Logging**
   - Errors logged with context
   - Poll cycle timing tracked
   - Cache efficiency metrics

4. **Shutdown Handling**
   - Stops polling on SIGTERM/SIGINT
   - Allows graceful server shutdown

## Performance Tuning

### For Faster Updates (Lower Latency)

```env
POLLING_INTERVAL=2000           # Every 2 seconds
MARKET_CACHE_TTL=120000         # 2 minutes
```

**Trade-off:** Higher API usage, but fresher data (2-second latency)

### For Lower API Usage (Cost Optimization)

```env
POLLING_INTERVAL=10000          # Every 10 seconds
MARKET_CACHE_TTL=900000         # 15 minutes
MAX_MARKETS_PER_KEYWORD=2       # Only 2 markets per keyword
POLLS_TWEETS_LIMIT=5            # Only 5 tweets
```

**Trade-off:** Lower API costs, but less frequent updates (10-second latency)

### Recommended (Balanced)

```env
POLLING_INTERVAL=3000           # Every 3 seconds
MARKET_CACHE_TTL=300000         # 5 minutes
MAX_MARKETS_PER_KEYWORD=5
POLLS_TWEETS_LIMIT=10
```

## Troubleshooting

### Markets Not Updating

1. Check if poller is running:
   ```javascript
   console.log(polymarketPoller.getStatus().isRunning);
   ```

2. Check WebSocket connection:
   - Verify frontend WebSocket is connected
   - Check browser console for connection errors

3. Check for errors:
   ```javascript
   console.log(polymarketPoller.getStatus().lastError);
   ```

### High API Usage

1. Increase cache TTL:
   ```env
   MARKET_CACHE_TTL=600000  # 10 minutes
   ```

2. Reduce polling frequency:
   ```env
   POLLING_INTERVAL=5000    # 5 seconds
   ```

3. Reduce keywords searched:
   ```env
   MAX_MARKETS_PER_KEYWORD=2
   POLLS_TWEETS_LIMIT=5
   ```

### Memory Usage Growing

1. Check cache cleanup:
   - Cache auto-expires old entries
   - Manually cleanup if needed: `marketCache.cleanup()`

2. Reduce cache TTL (clears faster):
   ```env
   MARKET_CACHE_TTL=180000  # 3 minutes
   ```

3. Reduce tweets limit:
   ```env
   POLLS_TWEETS_LIMIT=5
   ```

## Future Enhancements

1. **Differential Updates**
   - Only send market changes (not all markets)
   - Further reduces bandwidth

2. **Per-User Filtering**
   - Send only markets matching user preferences
   - More efficient client-side processing

3. **Market Change Alerts**
   - Detect significant price movements
   - Alert clients immediately for major changes

4. **Predictive Caching**
   - Pre-fetch markets for likely future keywords
   - Reduce latency for trending topics

5. **Market Similarity Detection**
   - Group similar markets
   - Deduplicate results for related keywords
