-- ============================================================================
-- Migration: Create market_catalog table for Polymarket markets cache
-- ============================================================================
-- Purpose: Cache all active Polymarket markets for fast, intelligent matching
-- Strategy: Zero-downtime refresh with timestamp-based cleanup
-- Refresh: Every 10 minutes
-- ============================================================================

-- DROP TABLE IF EXISTS market_catalog CASCADE;

-- ============================================================================
-- CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_catalog (
  -- Primary identifier (market.id from API)
  id TEXT PRIMARY KEY,

  -- Basic market info (extracted from API for quick filtering)
  -- Note: id = event_id, question = event_title, slug = event_slug
  question TEXT NOT NULL,
  slug TEXT,

  -- Numeric fields for filtering/sorting
  volume_num NUMERIC DEFAULT 0,
  liquidity NUMERIC DEFAULT 0,
  volume_24hr NUMERIC DEFAULT 0,
  volume_1wk NUMERIC DEFAULT 0,
  volume_1mo NUMERIC DEFAULT 0,

  -- Price changes (for hot/trending detection)
  one_day_price_change NUMERIC DEFAULT 0,
  one_week_price_change NUMERIC DEFAULT 0,
  one_month_price_change NUMERIC DEFAULT 0,

  -- Outcomes & prices (as text, will be JSON strings like in API)
  outcomes TEXT,  -- JSON string: "[\"Yes\", \"No\"]"
  outcome_prices TEXT,  -- JSON string: "[\"0.45\", \"0.55\"]"

  -- Status flags
  active BOOLEAN DEFAULT true,
  closed BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,

  -- Dates
  end_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,

  -- Tags (JSONB array of tag objects from event)
  -- Example: [{"id": "282", "label": "Elon Musk", "slug": "elon-musk"}]
  tags JSONB DEFAULT '[]'::jsonb,

  -- Category (extracted from first tag slug)
  category TEXT,

  -- Market data as JSONB (stores events array and additional useful fields)
  -- Only stores events array + essential fields (not full market object)
  -- This reduces storage size while keeping necessary information
  market_data JSONB NOT NULL,

  -- Cache management timestamps
  refreshed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index for cache cleanup (delete old data)
CREATE INDEX IF NOT EXISTS idx_market_catalog_refreshed_at
  ON market_catalog(refreshed_at DESC);

-- Index for active markets filtering (most common query)
CREATE INDEX IF NOT EXISTS idx_market_catalog_active
  ON market_catalog(active) WHERE active = true;

-- Index for volume sorting (most common sort)
CREATE INDEX IF NOT EXISTS idx_market_catalog_volume
  ON market_catalog(volume_num DESC);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_market_catalog_category
  ON market_catalog(category);

-- Composite index for active + volume (common combination)
CREATE INDEX IF NOT EXISTS idx_market_catalog_active_volume
  ON market_catalog(active, volume_num DESC) WHERE active = true;

-- Index for full-text search on questions
CREATE INDEX IF NOT EXISTS idx_market_catalog_question_fts
  ON market_catalog USING gin(to_tsvector('english', question));

-- Index for JSONB tags (for tag-based filtering)
CREATE INDEX IF NOT EXISTS idx_market_catalog_tags
  ON market_catalog USING gin(tags);

-- Index for end_date filtering (to remove expired markets)
CREATE INDEX IF NOT EXISTS idx_market_catalog_end_date
  ON market_catalog(end_date);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE market_catalog IS
  'Cached catalog of all active Polymarket markets. Refreshed every 10 minutes with zero-downtime strategy. Each row represents a market (not event).';

COMMENT ON COLUMN market_catalog.id IS
  'Polymarket market ID (primary key, same as event_id). Example: "565929"';

COMMENT ON COLUMN market_catalog.question IS
  'Market question (same as event_title). Example: "Tesla launches unsupervised full self driving (FSD) by October 31?"';

COMMENT ON COLUMN market_catalog.slug IS
  'Market slug (same as event_slug). Example: "tesla-launches-unsupervised-fsd"';

COMMENT ON COLUMN market_catalog.tags IS
  'Tags from parent event as JSONB array. Example: [{"id": "282", "label": "Elon Musk", "slug": "elon-musk"}]';

COMMENT ON COLUMN market_catalog.market_data IS
  'Optimized market data as JSONB. Stores events array + essential fields (conditionId, questionID, resolutionSource, description, image, icon). Not the full market object to reduce storage.';

COMMENT ON COLUMN market_catalog.refreshed_at IS
  'Timestamp of last refresh. Used for zero-downtime cache cleanup. Old data deleted AFTER new data is written.';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_market_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_market_catalog_updated_at ON market_catalog;
CREATE TRIGGER trigger_market_catalog_updated_at
  BEFORE UPDATE ON market_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_market_catalog_updated_at();

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up old market data
-- Deletes markets older than the specified interval (default: 15 minutes)
-- Called AFTER successful refresh to ensure zero downtime
CREATE OR REPLACE FUNCTION cleanup_old_markets(older_than_minutes INTEGER DEFAULT 15)
RETURNS TABLE(deleted_count INTEGER, deleted_ids TEXT[]) AS $$
DECLARE
  ids_to_delete TEXT[];
  count_deleted INTEGER;
BEGIN
  -- Get IDs that will be deleted (for logging)
  SELECT ARRAY_AGG(id) INTO ids_to_delete
  FROM market_catalog
  WHERE refreshed_at < NOW() - (older_than_minutes || ' minutes')::INTERVAL;

  -- Delete old markets
  DELETE FROM market_catalog
  WHERE refreshed_at < NOW() - (older_than_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS count_deleted = ROW_COUNT;

  RETURN QUERY SELECT count_deleted, COALESCE(ids_to_delete, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_markets IS
  'Deletes markets older than specified minutes. Returns count and IDs of deleted markets. Call AFTER successful refresh for zero downtime.';

-- ============================================================================
-- STATS VIEW (For monitoring)
-- ============================================================================

CREATE OR REPLACE VIEW market_catalog_stats AS
SELECT
  COUNT(*) as total_markets,
  COUNT(*) FILTER (WHERE active = true) as active_markets,
  COUNT(*) FILTER (WHERE closed = true) as closed_markets,
  COUNT(DISTINCT category) as total_categories,
  SUM(volume_num) as total_volume,
  AVG(volume_num) as avg_volume,
  MAX(volume_num) as max_volume,
  MIN(volume_num) as min_volume,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY volume_num) as median_volume,
  MIN(refreshed_at) as oldest_refresh,
  MAX(refreshed_at) as latest_refresh,
  EXTRACT(EPOCH FROM (NOW() - MAX(refreshed_at))) as seconds_since_last_refresh,
  pg_size_pretty(pg_total_relation_size('market_catalog')) as table_size
FROM market_catalog;

COMMENT ON VIEW market_catalog_stats IS
  'Real-time statistics about the market catalog for monitoring and debugging.';

-- ============================================================================
-- CATEGORY STATS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW market_catalog_by_category AS
SELECT
  category,
  COUNT(*) as market_count,
  SUM(volume_num) as total_volume,
  AVG(volume_num) as avg_volume,
  MAX(volume_num) as max_volume,
  COUNT(*) FILTER (WHERE active = true) as active_count
FROM market_catalog
GROUP BY category
ORDER BY total_volume DESC;

COMMENT ON VIEW market_catalog_by_category IS
  'Market statistics grouped by category.';

-- ============================================================================
-- DONE
-- ============================================================================

-- To run this migration:
-- psql -U postgres -d your_database -f 003_create_market_catalog.sql

-- Or in Supabase SQL editor:
-- Just copy and paste this entire file

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get all active markets sorted by volume
-- SELECT id, question, volume_num, category FROM market_catalog
-- WHERE active = true ORDER BY volume_num DESC LIMIT 100;

-- Get markets by category
-- SELECT id, question, volume_num FROM market_catalog
-- WHERE category = 'crypto' AND active = true ORDER BY volume_num DESC;

-- Full text search on questions
-- SELECT id, question, volume_num FROM market_catalog
-- WHERE to_tsvector('english', question) @@ to_tsquery('english', 'bitcoin | crypto')
-- ORDER BY volume_num DESC LIMIT 20;

-- Get catalog stats
-- SELECT * FROM market_catalog_stats;

-- Cleanup old markets (manual)
-- SELECT * FROM cleanup_old_markets(15);
