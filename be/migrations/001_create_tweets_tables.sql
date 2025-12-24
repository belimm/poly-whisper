-- ============================================================================
-- Migration: Create tweets and tweet_analyses tables
-- ============================================================================
-- Purpose: Store tweets and their analyses for persistence and recovery
-- ============================================================================

-- Tweets table (stores tweetDetails from enriched format)
CREATE TABLE IF NOT EXISTS public.tweets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tweet_id TEXT UNIQUE NOT NULL, -- tweetDetails.tweetId
    author_id TEXT, -- tweetDetails.authorId
    author_username TEXT, -- tweetDetails.authorUsername
    author_name TEXT, -- tweetDetails.authorName
    author_avatar_url TEXT, -- tweetDetails.authorAvatarURL
    text TEXT NOT NULL, -- tweetDetails.text
    created_at TIMESTAMPTZ NOT NULL, -- tweetDetails.createdAt
    like_count INTEGER DEFAULT 0, -- tweetDetails.likeCount
    retweet_count INTEGER DEFAULT 0, -- tweetDetails.retweetCount
    reply_count INTEGER DEFAULT 0, -- tweetDetails.replyCount
    url TEXT, -- tweetDetails.url
    received_at_ms BIGINT, -- tweetDetails.receivedAtMs
    enriched_at TIMESTAMPTZ, -- enrichedAt timestamp
    raw_data JSONB, -- Store complete enriched object
    indexed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tweet analyses table
CREATE TABLE IF NOT EXISTS public.tweet_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tweet_id UUID REFERENCES public.tweets(id) ON DELETE CASCADE,
    analysis_type TEXT DEFAULT 'sentiment', -- sentiment, keywords, category, etc.
    sentiment TEXT, -- positive, negative, neutral
    sentiment_score NUMERIC(3,2), -- -1.00 to 1.00
    keywords TEXT[], -- Array of extracted keywords
    categories TEXT[], -- Array of categories
    summary TEXT,
    raw_analysis JSONB, -- Complete LLM response
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tweet_id, analysis_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON public.tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_author ON public.tweets(author_username);
CREATE INDEX IF NOT EXISTS idx_tweets_tweet_id ON public.tweets(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_analyses_tweet_id ON public.tweet_analyses(tweet_id);

-- Create view for tweets with analysis (for easier querying)
-- Note: This view will be updated in migration 002 to handle analysis_version
-- For now, it uses a simple LEFT JOIN
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
    -- Simple LEFT JOIN for initial version (will be updated in migration 002)
    -- This handles the case where analysis_version column doesn't exist yet
    jsonb_build_object(
        'sentiment', ta.sentiment,
        'sentiment_score', ta.sentiment_score,
        'keywords', ta.keywords,
        'categories', ta.categories,
        'summary', ta.summary
    ) as analysis
FROM public.tweets t
LEFT JOIN public.tweet_analyses ta ON t.id = ta.tweet_id AND ta.analysis_type = 'sentiment'
ORDER BY t.created_at DESC;

COMMENT ON TABLE public.tweets IS 'Stores tweets from Twitter WebSocket with full tweet details';
COMMENT ON TABLE public.tweet_analyses IS 'Stores LLM analysis results for tweets';
COMMENT ON VIEW public.tweets_with_analysis IS 'View combining tweets with their analyses for easier querying';

