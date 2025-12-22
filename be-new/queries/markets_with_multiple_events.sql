-- ============================================================================
-- Query: Markets with Multiple Events
-- ============================================================================
-- Finds all markets in market_catalog where market_data.events array has > 1 event
-- ============================================================================

-- Basic query: Get markets with more than 1 event
SELECT 
  id,
  question,
  slug,
  category,
  volume_num,
  jsonb_array_length(market_data->'events') as event_count,
  market_data->'events' as events
FROM market_catalog
WHERE jsonb_array_length(market_data->'events') > 1
ORDER BY jsonb_array_length(market_data->'events') DESC, volume_num DESC;

-- ============================================================================
-- Detailed query: Show event details
-- ============================================================================

SELECT 
  id,
  question,
  slug,
  category,
  volume_num,
  jsonb_array_length(market_data->'events') as event_count,
  -- Extract event IDs
  (
    SELECT jsonb_agg(event->>'id')
    FROM jsonb_array_elements(market_data->'events') as event
  ) as event_ids,
  -- Extract event titles
  (
    SELECT jsonb_agg(event->>'title')
    FROM jsonb_array_elements(market_data->'events') as event
  ) as event_titles,
  -- Extract event slugs
  (
    SELECT jsonb_agg(event->>'slug')
    FROM jsonb_array_elements(market_data->'events') as event
  ) as event_slugs,
  market_data->'events' as full_events_array
FROM market_catalog
WHERE jsonb_array_length(market_data->'events') > 1
ORDER BY jsonb_array_length(market_data->'events') DESC, volume_num DESC;

-- ============================================================================
-- Summary query: Count markets by event count
-- ============================================================================

SELECT 
  jsonb_array_length(market_data->'events') as event_count,
  COUNT(*) as market_count,
  SUM(volume_num) as total_volume,
  AVG(volume_num) as avg_volume
FROM market_catalog
WHERE jsonb_array_length(market_data->'events') > 0
GROUP BY jsonb_array_length(market_data->'events')
ORDER BY event_count DESC;

-- ============================================================================
-- Stats query: Markets with most events
-- ============================================================================

SELECT 
  id,
  question,
  category,
  volume_num,
  jsonb_array_length(market_data->'events') as event_count,
  active,
  closed
FROM market_catalog
WHERE jsonb_array_length(market_data->'events') > 1
  AND active = true
  AND closed = false
ORDER BY jsonb_array_length(market_data->'events') DESC, volume_num DESC
LIMIT 20;

-- ============================================================================
-- Unnest query: Show each event as a separate row
-- ============================================================================
-- This query "flattens" the events array so each event appears as a separate row

SELECT 
  mc.id as market_id,
  mc.question as market_question,
  mc.category,
  mc.volume_num,
  event->>'id' as event_id,
  event->>'title' as event_title,
  event->>'slug' as event_slug,
  event->>'ticker' as event_ticker,
  event->>'description' as event_description,
  event->>'startDate' as event_start_date,
  event->>'endDate' as event_end_date,
  jsonb_array_length(mc.market_data->'events') as total_events_in_market
FROM market_catalog mc,
  jsonb_array_elements(mc.market_data->'events') as event
WHERE jsonb_array_length(mc.market_data->'events') > 1
ORDER BY mc.id, event->>'id';

