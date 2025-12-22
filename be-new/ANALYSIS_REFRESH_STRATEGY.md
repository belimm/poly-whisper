# Analysis Refresh Strategy

## Problem Statement

**The Challenge:**
- Users view the last 200 tweets on the frontend
- Market analysis is done when tweets are first received (point-in-time)
- Markets can close, resolve, or new markets can open
- Analysis becomes stale over time

**The Question:**
Should market matching be a **point-in-time snapshot** or reflect the **current market state**?

## Solution: Hybrid Approach

We implement a **hybrid strategy** that gives you the best of both worlds:

### 1. **Original Analysis (Point-in-Time)**
- ✅ **Stored when tweet is first received**
- ✅ **Historical accuracy** - shows what markets were relevant when tweet was posted
- ✅ **Performance** - no re-analysis needed
- ✅ **Consistency** - same tweet shows same markets (unless refreshed)

### 2. **Refreshed Analysis (Current State)**
- ✅ **Optional refresh** against current markets
- ✅ **Shows current relevant markets** (excludes closed/resolved markets)
- ✅ **Includes new markets** that opened after tweet was posted
- ✅ **Stored separately** - preserves original analysis

### 3. **Auto-Refresh (Background)**
- ✅ **Periodic refresh** of stale analyses (default: 24 hours)
- ✅ **Configurable interval** via environment variable
- ✅ **Batch processing** to avoid overwhelming the system

## Implementation

### Database Schema

```sql
-- tweet_analyses table now includes:
- analysis_version: 'original' | 'refreshed'
- refreshed_at: timestamp of last refresh
- markets_matched: JSONB array of matched markets
```

### API Endpoints

#### Refresh Single Tweet
```http
POST /api/analysis/refresh/:tweetId
```

#### Refresh Multiple Tweets
```http
POST /api/analysis/refresh-batch
Content-Type: application/json

{
  "tweetIds": ["123456", "789012"]
}
```

#### Refresh Stale Analyses
```http
POST /api/analysis/refresh-stale?limit=50
```

### Frontend Integration

#### Option 1: Show Original Analysis (Default)
```typescript
// GET /api/tweets/with-analysis
// Returns tweets with original analysis
{
  tweets: [
    {
      tweetDetails: {...},
      analysis: {...}, // Original point-in-time
      markets: [...],  // Markets from when tweet was received
      analysisRefreshedAt: null
    }
  ]
}
```

#### Option 2: Show Refreshed Analysis (If Available)
```typescript
// GET /api/tweets/with-analysis?useRefreshed=true
// Returns tweets with latest analysis (refreshed if available)
{
  tweets: [
    {
      tweetDetails: {...},
      analysis: {...}, // Refreshed if available, otherwise original
      markets: [...],  // Current markets
      analysisRefreshedAt: "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### Option 3: On-Demand Refresh
```typescript
// User clicks "Refresh Analysis" button
await fetch(`/api/analysis/refresh/${tweetId}`, { method: 'POST' });
// Tweet analysis is refreshed against current markets
```

## Configuration

### Environment Variables

```bash
# Auto-refresh interval (hours)
ANALYSIS_REFRESH_INTERVAL_HOURS=24

# Batch size for auto-refresh
ANALYSIS_REFRESH_BATCH_SIZE=10
```

### Auto-Refresh Service

The `AnalysisRefreshService` runs in the background:
- Checks for stale analyses every 24 hours (configurable)
- Refreshes analyses older than the interval
- Processes in batches to avoid rate limiting

## Recommendations

### For Your Use Case (25-30 accounts, 200 tweets)

**Recommended Strategy:**

1. **Default View**: Show **original analysis** (point-in-time)
   - Fast loading
   - Historical context preserved
   - Consistent user experience

2. **Auto-Refresh**: Enable **background refresh** every 24 hours
   - Keeps analyses reasonably fresh
   - Doesn't impact initial page load
   - Automatic, no user action needed

3. **On-Demand Refresh**: Add **"Refresh Analysis"** button
   - Users can manually refresh if they want current markets
   - Useful for important tweets
   - Shows timestamp of last refresh

4. **Visual Indicators**:
   - Show analysis timestamp: "Analyzed 2 hours ago"
   - Show refresh badge if refreshed: "Refreshed 1 hour ago"
   - Allow users to toggle between original/refreshed

### Performance Considerations

**Original Analysis (Point-in-Time):**
- ✅ No API calls needed
- ✅ Instant loading
- ✅ Lower costs

**Refreshed Analysis:**
- ⚠️ Requires LLM API calls (cost)
- ⚠️ Takes 2-5 seconds per tweet
- ⚠️ Higher API usage

**Recommendation:**
- Use **original analysis** for initial page load
- Use **auto-refresh** for background updates
- Use **on-demand refresh** for user-requested updates

## Example Flow

### Initial Tweet Processing
```
Tweet Received → Analyze → Match Markets → Save (original) → Broadcast
```

### Auto-Refresh (Background)
```
Every 24 hours → Find stale analyses → Re-analyze → Re-match → Save (refreshed)
```

### User-Requested Refresh
```
User clicks "Refresh" → Re-analyze → Re-match → Save (refreshed) → Update UI
```

## Benefits

1. **Historical Accuracy**: Original analysis preserved
2. **Current Relevance**: Refreshed analysis available
3. **Performance**: Fast initial load with original analysis
4. **Flexibility**: Users can choose original or refreshed
5. **Automatic**: Background refresh keeps data fresh
6. **Cost-Effective**: Only refresh when needed

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Point-in-Time Only** | Fast, consistent, low cost | Stale markets, no new markets |
| **Always Refresh** | Always current | Slow, expensive, inconsistent |
| **Hybrid (Recommended)** | Best of both worlds | Slightly more complex |

## Conclusion

**The hybrid approach is recommended** because:
- ✅ Preserves historical context (original analysis)
- ✅ Provides current relevance (refreshed analysis)
- ✅ Balances performance and freshness
- ✅ Gives users control (on-demand refresh)
- ✅ Automatic background updates

This gives you the flexibility to show either point-in-time snapshots or current market state, depending on your needs.

