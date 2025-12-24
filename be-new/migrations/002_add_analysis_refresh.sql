-- ============================================================================
-- Migration: Add analysis refresh support
-- ============================================================================
-- Purpose: Support both point-in-time and refreshed market analysis
-- ============================================================================

-- Add columns to track analysis freshness
ALTER TABLE public.tweet_analyses
ADD COLUMN IF NOT EXISTS analysis_version TEXT DEFAULT 'original', -- 'original' or 'refreshed'
ADD COLUMN IF NOT EXISTS refreshed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS markets_matched JSONB DEFAULT '[]'::jsonb; -- Store matched markets

-- Update unique constraint to include analysis_version
-- First, drop the old constraint if it exists
ALTER TABLE public.tweet_analyses 
DROP CONSTRAINT IF EXISTS tweet_analyses_tweet_id_analysis_type_key;

-- Add new unique constraint including analysis_version
ALTER TABLE public.tweet_analyses
ADD CONSTRAINT tweet_analyses_tweet_id_analysis_type_version_key 
UNIQUE(tweet_id, analysis_type, analysis_version);

-- Create index for finding tweets that need refresh
-- Note: Cannot use NOW() in index predicate (not immutable)
-- Instead, we'll query directly on refreshed_at column
CREATE INDEX IF NOT EXISTS idx_tweet_analyses_refreshed_at 
ON public.tweet_analyses(refreshed_at DESC NULLS FIRST);

-- Create index for finding tweets with original analysis (no refresh yet)
CREATE INDEX IF NOT EXISTS idx_tweet_analyses_version 
ON public.tweet_analyses(analysis_version) 
WHERE analysis_version = 'original';

-- Add comment
COMMENT ON COLUMN public.tweet_analyses.analysis_version IS 
'Version of analysis: "original" (point-in-time when tweet was received) or "refreshed" (re-analyzed against current markets)';

COMMENT ON COLUMN public.tweet_analyses.refreshed_at IS 
'Timestamp when analysis was last refreshed against current markets. NULL means never refreshed.';

COMMENT ON COLUMN public.tweet_analyses.markets_matched IS 
'Array of matched markets from the analysis. Stored for quick access without re-querying.';

-- ============================================================================
-- UPDATE tweets_with_analysis VIEW
-- ============================================================================
-- Update the view to handle analysis_version and markets_matched
-- This replaces the simple view from migration 001

CREATE OR REPLACE VIEW public.tweets_with_analysis AS
SELECT 
    t.id,
    t.tweet_id,
    t.author_id,
    t.author_username,
    t.author_name,
    t.author_avatar_url,
    t.text,
    t.created_at,
    t.like_count,
    t.retweet_count,
    t.reply_count,
    t.url,
    t.received_at_ms,
    t.enriched_at,
    t.raw_data,
    jsonb_build_object(
        'tweetId', t.tweet_id,
        'text', t.text,
        'createdAt', t.created_at,
        'authorId', t.author_id,
        'authorUsername', t.author_username,
        'authorName', t.author_name,
        'authorAvatarURL', t.author_avatar_url,
        'isRetweet', false,
        'isReply', false,
        'likeCount', t.like_count,
        'retweetCount', t.retweet_count,
        'replyCount', t.reply_count,
        'url', t.url,
        'receivedAtMs', t.received_at_ms
    ) as tweet_details,
    -- Prefer refreshed analysis, fallback to original, then raw_data
    COALESCE(
        -- Try refreshed analysis first
        (SELECT jsonb_build_object(
            'sentiment', ta.sentiment,
            'sentiment_score', ta.sentiment_score,
            'keywords', ta.keywords,
            'categories', ta.categories,
            'summary', ta.summary,
            'markets_matched', COALESCE(ta.markets_matched, '[]'::jsonb)
        )
        FROM public.tweet_analyses ta
        WHERE ta.tweet_id = t.id 
        AND ta.analysis_type = 'sentiment' 
        AND ta.analysis_version = 'refreshed'
        ORDER BY ta.refreshed_at DESC
        LIMIT 1),
        -- Fallback to original analysis
        (SELECT jsonb_build_object(
            'sentiment', ta.sentiment,
            'sentiment_score', ta.sentiment_score,
            'keywords', ta.keywords,
            'categories', ta.categories,
            'summary', ta.summary,
            'markets_matched', COALESCE(ta.markets_matched, '[]'::jsonb)
        )
        FROM public.tweet_analyses ta
        WHERE ta.tweet_id = t.id 
        AND ta.analysis_type = 'sentiment' 
        AND ta.analysis_version = 'original'
        LIMIT 1),
        -- Final fallback: extract from raw_data if no analysis exists in tweet_analyses table
        CASE 
            WHEN t.raw_data IS NOT NULL AND t.raw_data ? 'analysis' 
            THEN jsonb_build_object(
                'sentiment', COALESCE(t.raw_data->'analysis'->>'sentiment', 'neutral'),
                'sentiment_score', COALESCE(
                    CASE 
                        WHEN t.raw_data->'analysis'->>'sentiment_score' ~ '^[0-9]+\.?[0-9]*$'
                        THEN (t.raw_data->'analysis'->>'sentiment_score')::numeric
                        ELSE 0.5
                    END,
                    0.5
                ),
                'keywords', COALESCE(
                    CASE 
                        WHEN jsonb_typeof(t.raw_data->'analysis'->'keywords') = 'array'
                        THEN t.raw_data->'analysis'->'keywords'
                        ELSE '[]'::jsonb
                    END,
                    '[]'::jsonb
                ),
                'categories', COALESCE(
                    CASE 
                        WHEN jsonb_typeof(t.raw_data->'analysis'->'categories') = 'array'
                        THEN t.raw_data->'analysis'->'categories'
                        ELSE '[]'::jsonb
                    END,
                    '[]'::jsonb
                ),
                'summary', t.raw_data->'analysis'->>'summary',
                'markets_matched', COALESCE(t.raw_data->'markets', '[]'::jsonb)
            )
            ELSE jsonb_build_object(
                'sentiment', 'neutral',
                'sentiment_score', 0.5,
                'keywords', '[]'::jsonb,
                'categories', '[]'::jsonb,
                'summary', NULL,
                'markets_matched', '[]'::jsonb
            )
        END
    ) as analysis
FROM public.tweets t
ORDER BY t.created_at DESC;

COMMENT ON VIEW public.tweets_with_analysis IS 
'View combining tweets with their analyses. Prefers refreshed analysis, falls back to original, then raw_data.';

-- Create view for tweets with latest analysis (original or refreshed)
-- Uses LEFT JOIN for better performance than subqueries
CREATE OR REPLACE VIEW public.tweets_with_latest_analysis AS
SELECT 
    t.id,
    t.tweet_id,
    t.author_id,
    t.author_username,
    t.author_name,
    t.author_avatar_url,
    t.text,
    t.created_at,
    t.like_count,
    t.retweet_count,
    t.reply_count,
    t.url,
    t.received_at_ms,
    t.enriched_at,
    t.raw_data,
    -- Get the most recent analysis (prefer refreshed, fallback to original)
    COALESCE(
        refreshed_ta.id,
        original_ta.id
    ) as latest_analysis_id,
    COALESCE(
        refreshed_ta.analysis_version,
        original_ta.analysis_version,
        'original'
    ) as analysis_version,
    COALESCE(
        refreshed_ta.sentiment,
        original_ta.sentiment
    ) as sentiment,
    COALESCE(
        refreshed_ta.sentiment_score,
        original_ta.sentiment_score
    ) as sentiment_score,
    COALESCE(
        refreshed_ta.keywords,
        original_ta.keywords,
        ARRAY[]::TEXT[]
    ) as keywords,
    COALESCE(
        refreshed_ta.categories,
        original_ta.categories,
        ARRAY[]::TEXT[]
    ) as categories,
    COALESCE(
        refreshed_ta.summary,
        original_ta.summary
    ) as summary,
    COALESCE(
        refreshed_ta.markets_matched,
        original_ta.markets_matched,
        '[]'::jsonb
    ) as markets_matched,
    COALESCE(
        refreshed_ta.refreshed_at,
        original_ta.analyzed_at
    ) as analysis_timestamp,
    jsonb_build_object(
        'tweetId', t.tweet_id,
        'text', t.text,
        'createdAt', t.created_at,
        'authorId', t.author_id,
        'authorUsername', t.author_username,
        'authorName', t.author_name,
        'authorAvatarURL', t.author_avatar_url,
        'isRetweet', false,
        'isReply', false,
        'likeCount', t.like_count,
        'retweetCount', t.retweet_count,
        'replyCount', t.reply_count,
        'url', t.url,
        'receivedAtMs', t.received_at_ms
    ) as tweet_details
FROM public.tweets t
LEFT JOIN LATERAL (
    SELECT * FROM public.tweet_analyses ta
    WHERE ta.tweet_id = t.id 
    AND ta.analysis_type = 'sentiment' 
    AND ta.analysis_version = 'refreshed'
    ORDER BY ta.refreshed_at DESC
    LIMIT 1
) refreshed_ta ON true
LEFT JOIN LATERAL (
    SELECT * FROM public.tweet_analyses ta
    WHERE ta.tweet_id = t.id 
    AND ta.analysis_type = 'sentiment' 
    AND ta.analysis_version = 'original'
    LIMIT 1
) original_ta ON true
ORDER BY t.created_at DESC;

COMMENT ON VIEW public.tweets_with_latest_analysis IS 
'View showing tweets with their latest analysis (refreshed if available, otherwise original).';

