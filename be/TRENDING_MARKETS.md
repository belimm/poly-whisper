# Trending & Hot Markets Feature

This document describes the trending and hot markets feature implemented in the Poly-Whisper backend.

## Overview

The backend now automatically identifies and broadcasts trending and hot markets to connected WebSocket clients. This feature runs independently and continuously, updating every 10 seconds (configurable).

## Architecture

### Components

1. **TrendingMarketService** ([trendingMarketService.ts](src/services/market/trendingMarketService.ts))
   - Processes market catalog data into trending and hot categories
   - Calculates volume spikes, volatility scores, and hot scores
   - Categorizes markets (Crypto, Politics, Geopolitics, Business, AI & Tech, Economy, Sports)

2. **TrendingMarketPoller** ([trendingMarketPoller.ts](src/services/market/trendingMarketPoller.ts))
   - Polls the MarketCatalogService every 10 seconds
   - Processes data using TrendingMarketService
   - Broadcasts results to all connected WebSocket clients

3. **Market Routes** ([marketRoutes.ts](src/routes/marketRoutes.ts))
   - REST API endpoints to fetch trending/hot markets on-demand

## Trending vs Hot Markets

### Trending Markets
**Definition:** Highest volume markets per category

**Algorithm:**
1. Group all active markets by category (Crypto, Politics, etc.)
2. For each category, select the market with the highest 24-hour volume
3. Sort by category priority
4. Return minimum 4 markets (fills with highest volume if needed)

**Use Case:** Shows the most popular/active markets in each category

### Hot Markets
**Definition:** Markets with high volatility and volume spikes

**Algorithm:**
1. Calculate hot score: `Math.abs(priceChange1h) * 300 + Math.abs(priceChange24h) * 100 + volumeSpike * 0.5`
2. Volume spike = (24h volume / 7-day avg volume - 1) * 100
3. Filter by liquidity >= $10,000
4. Select top 10 by hot score
5. Return minimum 4 markets (relaxed criteria if needed)

**Hot Reasons:**
- `RAPID_RISE` - Price increased >5% in 1 hour
- `SELL_OFF` - Price decreased >5% in 1 hour
- `VOLUME_SPIKE` - Volume >200% above average
- `RISING` - Price increased >3% in 24 hours
- `FALLING` - Price decreased >3% in 24 hours
- `HIGH_ACTIVITY` - Volume >50% above average
- `VOLATILE` - General volatility detected

**Use Case:** Shows markets experiencing significant price movement or unusual activity

## WebSocket Integration

### Message Type
```typescript
{
  type: 'trendingMarketUpdate',
  data: {
    trending: TrendingMarket[],
    hot: HotMarket[],
    lastUpdated: string
  },
  timestamp: string
}
```

### Broadcast Frequency
- Every 10 seconds (configurable via `MARKET_TRENDING_INTERVAL` env var)
- Automatically broadcasts to all connected WebSocket clients
- No client subscription needed

## REST API Endpoints

### GET /api/markets/trending
Returns latest trending markets only.

**Response:**
```json
{
  "trending": [...],
  "lastUpdated": "2026-01-04T...",
  "status": {
    "isRunning": true,
    "lastFetchTime": "2026-01-04T..."
  }
}
```

### GET /api/markets/hot
Returns latest hot markets only.

**Response:**
```json
{
  "hot": [...],
  "lastUpdated": "2026-01-04T...",
  "status": {
    "isRunning": true,
    "lastFetchTime": "2026-01-04T..."
  }
}
```

### GET /api/markets/trending-hot
Returns both trending and hot markets.

**Response:**
```json
{
  "trending": [...],
  "hot": [...],
  "lastUpdated": "2026-01-04T...",
  "status": {
    "isRunning": true,
    "lastFetchTime": "2026-01-04T..."
  }
}
```

### GET /api/markets/trending/status
Returns poller status information.

**Response:**
```json
{
  "isRunning": true,
  "pollingInterval": 10000,
  "lastFetchTime": "2026-01-04T...",
  "hasData": true,
  "catalogReady": true,
  "catalogSize": 1234
}
```

## Configuration

Environment variables:

- `MARKET_TRENDING_INTERVAL` - Polling interval in milliseconds (default: 10000 = 10 seconds)
- `MARKET_CATALOG_MIN_VOLUME` - Minimum market volume to include (default: 10000)
- `MARKET_CATALOG_MIN_LIQUIDITY` - Minimum market liquidity to include (default: 500)

## Data Flow

```
MarketCatalogService (polls Polymarket every 10 min)
         ↓
    (in-memory cache)
         ↓
TrendingMarketPoller (every 10 seconds)
         ↓
TrendingMarketService (processes data)
         ↓
ClientWebSocketService (broadcasts to all clients)
```

## Categories & Tags

### Primary Categories
- **CRYPTO** (₿) - Crypto, Bitcoin, Stablecoins
- **GEOPOLITICS** (🌍) - Ukraine, Russia, Iran, Middle East
- **POLITICS** (🗳️) - Elections, Marijuana, Policy
- **BUSINESS** (📈) - Startups, Big Tech
- **AI & TECH** (🤖) - Artificial Intelligence, Technology
- **ECONOMY** (💰) - Economic Policy, Markets
- **SPORTS** (🏀) - Sports betting markets

### Tag Mapping
Tags from Polymarket are automatically mapped to primary categories for cleaner UI display.

## Performance

- **Lightweight:** Uses existing MarketCatalogService data (no additional API calls)
- **Efficient:** In-memory processing with O(n) complexity
- **Scalable:** Broadcasts to unlimited WebSocket clients
- **Resilient:** Graceful degradation if data unavailable

## Monitoring

Check poller status:
```bash
curl http://localhost:3000/api/markets/trending/status
```

Logs to watch:
- `✅ Trending Market Poller started`
- `📊 Trending Market Poller: polling every 10000ms`
- `📈 Processed: X trending, Y hot markets`
- `📡 Broadcasted trending market update to N client(s)`

## Graceful Shutdown

The poller automatically stops during server shutdown:
1. Market catalog service stopped
2. **Trending market poller stopped** ← NEW
3. WebSocket services closed
4. Server closed gracefully

## Frontend Integration

### WebSocket Client
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'trendingMarketUpdate') {
    const { trending, hot, lastUpdated } = message.data;

    // Update UI with trending markets
    updateTrendingUI(trending);

    // Update UI with hot markets
    updateHotUI(hot);
  }
};
```

### REST API Client
```javascript
// Fetch on-demand (useful for initial page load)
const response = await fetch('http://localhost:3000/api/markets/trending-hot');
const data = await response.json();

console.log('Trending:', data.trending);
console.log('Hot:', data.hot);
```

## Migration from Old Backend

This implementation replicates the functionality from `be-old/src/services/market/`:

- ✅ `marketTrendingPoller.js` → `trendingMarketPoller.ts`
- ✅ `trendingService.js` → `trendingMarketService.ts`
- ✅ WebSocket broadcast with `trendingMarketUpdate` message type
- ✅ 10-second polling interval
- ✅ Category-based trending selection
- ✅ Hot score calculation with volume spike detection
- ✅ Graceful startup and shutdown

### Key Improvements over Old Backend

1. **TypeScript** - Full type safety and better IDE support
2. **Leverages MarketCatalogService** - No redundant API calls to Polymarket
3. **REST API endpoints** - On-demand access to trending/hot data
4. **Better error handling** - Resilient to catalog unavailability
5. **Configurable via environment variables** - More flexible deployment
6. **Status endpoint** - Real-time monitoring and debugging

## Troubleshooting

### No trending/hot data available

**Symptom:** REST API returns `No trending market data available yet`

**Cause:** Poller hasn't completed first cycle, or MarketCatalogService not ready

**Solution:**
1. Check catalog service status: `GET /api/markets/catalog/stats`
2. Wait for first catalog refresh (up to 10 minutes on first startup)
3. Check poller status: `GET /api/markets/trending/status`

### Poller not broadcasting

**Symptom:** No WebSocket messages received

**Cause:** WebSocket not connected, or poller not started

**Solution:**
1. Verify WebSocket connection: Check for `welcome` message
2. Check server logs for "Trending Market Poller started"
3. Verify poller is running: `GET /api/markets/trending/status`

### Empty trending/hot arrays

**Symptom:** Data returned but arrays are empty

**Cause:** Not enough markets in catalog meeting minimum criteria

**Solution:**
1. Lower `MARKET_CATALOG_MIN_VOLUME` and `MARKET_CATALOG_MIN_LIQUIDITY`
2. Wait for catalog to populate (check `/api/markets/catalog/stats`)
3. Verify markets exist in catalog with sufficient data

## Future Enhancements

Potential improvements:

- [ ] Add 1-hour price change data (currently missing from schema)
- [ ] Persist trending/hot history to database for analytics
- [ ] Add client-side filtering (e.g., subscribe to specific categories)
- [ ] Implement trending/hot market notifications
- [ ] Add more sophisticated hot score algorithms
- [ ] Track trending changes over time (e.g., "rising" vs "falling" trends)
