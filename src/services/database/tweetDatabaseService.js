import { supabaseAdmin } from '../../infrastructure/database/supabaseClient.js';

/**
 * Service for managing tweets in the database
 * Handles enriched tweet format with tweetDetails and analysis
 */
class TweetDatabaseService {
    constructor() {
        this.supabase = supabaseAdmin;
    }

    /**
     * Insert a new tweet from enriched format
     * @param {object} enrichedTweet - Enriched tweet with tweetDetails and analysis
     * @returns {Promise<object>} Inserted tweet
     */
    async insertTweet(enrichedTweet) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const tweetDetails = enrichedTweet.tweetDetails || enrichedTweet;

        const { data, error } = await this.supabase
           .from('tweets')
           .insert([
              {
                 tweet_id: tweetDetails.tweetId,
                 author_id: tweetDetails.authorId,
                 author_username: tweetDetails.authorUsername,
                 author_name: tweetDetails.authorName,
                 author_avatar_url: tweetDetails.authorAvatarURL,
                 text: tweetDetails.text,
                 created_at: tweetDetails.createdAt || new Date().toISOString(),
                 like_count: tweetDetails.likeCount || 0,
                 retweet_count: tweetDetails.retweetCount || 0,
                 reply_count: tweetDetails.replyCount || 0,
                 url: tweetDetails.url,
                 received_at_ms: tweetDetails.receivedAtMs,
                 enriched_at:
                    enrichedTweet.enrichedAt || new Date().toISOString(),
                 raw_data: enrichedTweet,
              },
           ])
           .select()
           .single();

        if (error) {
            // If it's a duplicate, return the existing tweet
            if (error.code === '23505') {
                return this.getTweetByTwitterId(tweetDetails.tweetId);
            }
            throw error;
        }

        return data;
    }

    /**
     * Get tweet by Twitter ID
     * @param {string} tweetId - Twitter tweet ID
     * @returns {Promise<object>} Tweet data
     */
    async getTweetByTwitterId(tweetId) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error } = await this.supabase
            .from('tweets')
            .select('*')
            .eq('tweet_id', tweetId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get latest tweets in enriched format
     * @param {number} limit - Number of tweets to fetch
     * @param {number} offset - Offset for pagination
     * @returns {Promise<object>} Object with enriched tweets array and total count
     */
    async getLatestTweets(limit = 10, offset = 0) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error, count } = await this.supabase
            .from('tweets')
            .select('raw_data', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Return raw_data which contains the enriched format
        const enrichedTweets = data.map(row => row.raw_data);

        return { tweets: enrichedTweets, total: count };
    }

    /**
     * Get tweets with their analyses in enriched format
     * @param {number} limit - Number of tweets to fetch
     * @param {number} offset - Offset for pagination
     * @returns {Promise<object>} Object with enriched tweets and total count
     */
    async getTweetsWithAnalyses(limit = 10, offset = 0) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error, count } = await this.supabase
            .from('tweets_with_analysis')
            .select('*', { count: 'exact' })
            .range(offset, offset + limit - 1);
            
            

        if (error) throw error;

        // Transform to enriched format
        const enrichedTweets = data.map(row => ({
            tweetDetails: row.tweet_details,
            analysis: row.analysis,
            enrichedAt: row.enriched_at
        }));

        

        return { data: enrichedTweets, total: count };
    }

    /**
     * Insert tweet analysis
     * @param {string} tweetId - Database tweet ID (UUID)
     * @param {object} analysis - Analysis data
     * @returns {Promise<object>} Inserted analysis
     */
    async insertAnalysis(tweetId, analysis) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error} = await this.supabase
            .from('tweet_analyses')
            .upsert([{
                tweet_id: tweetId,
                analysis_type: 'sentiment',
                sentiment: analysis.sentiment,
                sentiment_score: analysis.sentimentScore,
                keywords: analysis.keywords || [],
                categories: analysis.categories || [],
                summary: analysis.summary,
                raw_analysis: analysis
            }], {
                onConflict: 'tweet_id,analysis_type'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Search tweets by keyword (returns enriched format)
     * @param {string} keyword - Keyword to search
     * @param {number} limit - Number of results
     * @returns {Promise<Array>} Matching tweets in enriched format
     */
    async searchTweets(keyword, limit = 50) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error } = await this.supabase
            .from('tweets')
            .select('raw_data')
            .ilike('text', `%${keyword}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Return raw_data which contains the enriched format
        return data.map(row => row.raw_data);
    }

    /**
     * Get tweet statistics
     * @returns {Promise<object>} Statistics
     */
    async getStatistics() {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const [tweetsCount, analysesCount] = await Promise.all([
            this.supabase.from('tweets').select('id', { count: 'exact', head: true }),
            this.supabase.from('tweet_analyses').select('id', { count: 'exact', head: true })
        ]);

        return {
            totalTweets: tweetsCount.count || 0,
            totalAnalyses: analysesCount.count || 0
        };
    }

    /**
     * Delete old tweets (cleanup)
     * @param {number} daysOld - Delete tweets older than this many days
     * @returns {Promise<number>} Number of deleted tweets
     */
    async deleteOldTweets(daysOld = 30) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const { data, error } = await this.supabase
            .from('tweets')
            .delete()
            .lt('created_at', cutoffDate.toISOString())
            .select('id');

        if (error) throw error;
        return data?.length || 0;
    }
}

export default TweetDatabaseService;
