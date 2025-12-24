-- ============================================================================
-- Diagnostic Query: Check why analysis is null in tweets_with_analysis view
-- ============================================================================

-- Check if analyses exist in tweet_analyses table
SELECT 
    t.tweet_id,
    t.id as tweet_db_id,
    COUNT(ta.id) as analysis_count,
    STRING_AGG(ta.analysis_version, ', ') as versions,
    ta.sentiment,
    ta.keywords,
    ta.categories
FROM public.tweets t
LEFT JOIN public.tweet_analyses ta ON t.id = ta.tweet_id AND ta.analysis_type = 'sentiment'
WHERE t.tweet_id IN ('2003046161993855048', '2003051621283148093')
GROUP BY t.tweet_id, t.id, ta.sentiment, ta.keywords, ta.categories
ORDER BY t.created_at DESC;

-- Check raw_data for these tweets
SELECT 
    tweet_id,
    id,
    raw_data->'analysis' as analysis_from_raw_data,
    raw_data->'markets' as markets_from_raw_data
FROM public.tweets
WHERE tweet_id IN ('2003046161993855048', '2003051621283148093')
ORDER BY created_at DESC;

-- Check what the view returns
SELECT 
    tweet_id,
    analysis,
    analysis->>'sentiment' as sentiment,
    analysis->>'keywords' as keywords
FROM public.tweets_with_analysis
WHERE tweet_id IN ('2003046161993855048', '2003051621283148093')
ORDER BY created_at DESC;

-- Check if analysis was saved with correct analysis_version
SELECT 
    ta.tweet_id,
    ta.analysis_version,
    ta.sentiment,
    ta.keywords,
    ta.categories,
    ta.analyzed_at,
    ta.refreshed_at
FROM public.tweet_analyses ta
WHERE ta.tweet_id IN (
    SELECT id FROM public.tweets 
    WHERE tweet_id IN ('2003046161993855048', '2003051621283148093')
)
ORDER BY ta.analyzed_at DESC;

