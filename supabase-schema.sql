-- PolySense Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Tweets table (stores tweetDetails from enriched format)
CREATE TABLE IF NOT EXISTS public.tweets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tweet_id TEXT UNIQUE NOT NULL, -- tweetDetails.tweetId
    author_id TEXT, -- tweetDetails.authorId
    author_username TEXT, -- tweetDetails.authorUsername
    author_name TEXT, -- tweetDetails.authorName
    author_avatar_url TEXT, -- tweetDetails.authorAvatar
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

-- Polymarket matches table
CREATE TABLE IF NOT EXISTS public.polymarket_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tweet_id UUID REFERENCES public.tweets(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    market_data JSONB NOT NULL, -- Store Polymarket API response
    matched_at TIMESTAMPTZ DEFAULT NOW()
);

-- User tweet interactions (favorites, bookmarks, etc.)
CREATE TABLE IF NOT EXISTS public.user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    tweet_id UUID REFERENCES public.tweets(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'bookmark', 'favorite', 'note'
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tweet_id, interaction_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON public.tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_author ON public.tweets(author_username);
CREATE INDEX IF NOT EXISTS idx_tweet_analyses_tweet_id ON public.tweet_analyses(tweet_id);
CREATE INDEX IF NOT EXISTS idx_polymarket_matches_tweet_id ON public.polymarket_matches(tweet_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_tweet_id ON public.user_interactions(tweet_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to user_profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweet_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polymarket_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can read all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.user_profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Tweets: All authenticated users can read tweets
CREATE POLICY "Authenticated users can view tweets"
    ON public.tweets FOR SELECT
    USING (auth.role() = 'authenticated');

-- Tweet analyses: All authenticated users can read analyses
CREATE POLICY "Authenticated users can view analyses"
    ON public.tweet_analyses FOR SELECT
    USING (auth.role() = 'authenticated');

-- Polymarket matches: All authenticated users can read matches
CREATE POLICY "Authenticated users can view polymarket matches"
    ON public.polymarket_matches FOR SELECT
    USING (auth.role() = 'authenticated');

-- User interactions: Users can only manage their own interactions
CREATE POLICY "Users can view their own interactions"
    ON public.user_interactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions"
    ON public.user_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions"
    ON public.user_interactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions"
    ON public.user_interactions FOR DELETE
    USING (auth.uid() = user_id);

-- Create a service role policy for backend to insert tweets
-- Note: Backend should use service_role key for these operations
CREATE POLICY "Service role can manage tweets"
    ON public.tweets FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage analyses"
    ON public.tweet_analyses FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage polymarket matches"
    ON public.polymarket_matches FOR ALL
    USING (auth.role() = 'service_role');

-- Create views for easier querying

-- View: Latest tweets with analysis (enriched format)
CREATE OR REPLACE VIEW public.tweets_with_analysis AS
SELECT
    t.id,
    jsonb_build_object(
        'tweetId', t.tweet_id,
        'authorId', t.author_id,
        'authorUsername', t.author_username,
        'authorName', t.author_name,
        'authorAvatarURL', t.author_avatar_url,
        'text', t.text,
        'createdAt', t.created_at,
        'likeCount', t.like_count,
        'retweetCount', t.retweet_count,
        'replyCount', t.reply_count,
        'url', t.url,
        'receivedAtMs', t.received_at_ms
    ) as tweet_details,
    jsonb_build_object(
        'sentiment', ta.sentiment,
        'sentimentScore', ta.sentiment_score,
        'keywords', ta.keywords,
        'categories', ta.categories,
        'summary', ta.summary
    ) as analysis,
    (SELECT json_agg(pm.market_data) FROM public.polymarket_matches pm WHERE pm.tweet_id = t.id) as polymarket_matches,
    t.enriched_at,
    t.indexed_at
FROM public.tweets t
LEFT JOIN public.tweet_analyses ta ON t.id = ta.tweet_id AND ta.analysis_type = 'sentiment'
ORDER BY t.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.tweets_with_analysis TO authenticated;
GRANT SELECT ON public.tweets_with_analysis TO service_role;
