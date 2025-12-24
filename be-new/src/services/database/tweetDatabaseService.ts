/**
 * Tweet Database Service (TypeScript)
 * Handles enriched tweet format with tweetDetails and analysis
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../infrastructure/database/supabaseClient';
import type { EnrichedTweet, TweetDetails, TweetAnalysis } from '../../types';

interface TweetRow {
   id: string;
   tweet_id: string;
   author_id: string | null;
   author_username: string | null;
   author_name: string | null;
   author_avatar_url: string | null;
   text: string;
   created_at: string;
   like_count: number;
   retweet_count: number;
   reply_count: number;
   url: string | null;
   received_at_ms: number | null;
   enriched_at: string | null;
   raw_data: EnrichedTweet | null;
}

interface AnalysisRow {
   id: string;
   tweet_id: string;
   analysis_type: string;
   analysis_version?: string; // 'original' | 'refreshed'
   sentiment: string | null;
   sentiment_score: number | null;
   keywords: string[];
   categories: string[];
   summary: string | null;
   raw_analysis: TweetAnalysis | null;
   markets_matched?: EnrichedTweet['markets'];
   refreshed_at?: string | null;
   analyzed_at: string;
}

export class TweetDatabaseService {
   private supabase: SupabaseClient | null;

   constructor(supabase?: SupabaseClient) {
      this.supabase = supabase || supabaseAdmin;
      if (!this.supabase) {
         throw new Error('Supabase client is required');
      }
   }

   /**
    * Insert a new tweet from enriched format
    */
   async insertTweet(enrichedTweet: EnrichedTweet): Promise<TweetRow> {
      if (!this.supabase) {
         throw new Error('Supabase client not initialized');
      }

      const tweetDetails = enrichedTweet.tweetDetails;

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

      return data as TweetRow;
   }

   /**
    * Get tweet by Twitter ID
    */
   async getTweetByTwitterId(tweetId: string): Promise<TweetRow> {
      if (!this.supabase) {
         throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase
         .from('tweets')
         .select('*')
         .eq('tweet_id', tweetId)
         .single();

      if (error) throw error;
      return data as TweetRow;
   }

   /**
    * Get latest tweets in enriched format
    */
   async getLatestTweets(
      limit = 10,
      offset = 0
   ): Promise<{ tweets: EnrichedTweet[]; total: number }> {
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
      const enrichedTweets = (data || [])
         .map((row) => row.raw_data)
         .filter((tweet): tweet is EnrichedTweet => tweet !== null);

      return { tweets: enrichedTweets, total: count || 0 };
   }

   /**
    * Get tweets with their analyses in enriched format
    */
   async getTweetsWithAnalyses(
      limit = 10,
      offset = 0
   ): Promise<{ data: EnrichedTweet[]; total: number }> {
      if (!this.supabase) {
         throw new Error('Supabase client not initialized');
      }

      const { data, error, count } = await this.supabase
         .from('tweets_with_analysis')
         .select('*', { count: 'exact' })
         .range(offset, offset + limit - 1);

      if (error) throw error;

      // Transform to enriched format
      const enrichedTweets = (data || []).map((row: any) => {
         // Parse tweet_details if it's a string
         let tweetDetails: TweetDetails;
         if (typeof row.tweet_details === 'string') {
            try {
               tweetDetails = JSON.parse(row.tweet_details) as TweetDetails;
            } catch {
               // Fallback to raw_data
               tweetDetails = (row.raw_data as EnrichedTweet)?.tweetDetails || {
                  tweetId: row.tweet_id,
                  text: row.text,
                  createdAt: row.created_at,
                  authorId: row.author_id || '',
                  authorUsername: row.author_username || '',
                  authorName: row.author_name || '',
                  authorAvatarURL: row.author_avatar_url || '',
                  isRetweet: false,
                  isReply: false,
                  likeCount: row.like_count || 0,
                  retweetCount: row.retweet_count || 0,
                  replyCount: row.reply_count || 0,
                  url: row.url,
                  receivedAtMs: row.received_at_ms,
               };
            }
         } else {
            tweetDetails = row.tweet_details as TweetDetails;
         }

         // Parse analysis - try multiple sources
         let analysis: TweetAnalysis;

         // First, try to get from view's analysis field
         if (row.analysis) {
            if (typeof row.analysis === 'string') {
               try {
                  const parsed = JSON.parse(row.analysis);
                  // Check if it has valid data (not all nulls)
                  if (
                     parsed.sentiment ||
                     parsed.keywords ||
                     parsed.categories
                  ) {
                     analysis = {
                        sentiment:
                           (parsed.sentiment as
                              | 'positive'
                              | 'negative'
                              | 'neutral') || 'neutral',
                        sentiment_score: parsed.sentiment_score || 0.5,
                        keywords: parsed.keywords || [],
                        categories: parsed.categories || [],
                        summary: parsed.summary,
                     };
                  } else {
                     // All nulls, fall through to raw_data
                     throw new Error('Analysis has all nulls');
                  }
               } catch {
                  // Parse failed or all nulls, use raw_data
                  analysis = this._extractAnalysisFromRawData(row.raw_data);
               }
            } else if (
               typeof row.analysis === 'object' &&
               row.analysis !== null
            ) {
               // Check if it has valid data (not all nulls)
               if (
                  row.analysis.sentiment ||
                  row.analysis.keywords ||
                  row.analysis.categories
               ) {
                  analysis = {
                     sentiment:
                        (row.analysis.sentiment as
                           | 'positive'
                           | 'negative'
                           | 'neutral') || 'neutral',
                     sentiment_score: row.analysis.sentiment_score || 0.5,
                     keywords: row.analysis.keywords || [],
                     categories: row.analysis.categories || [],
                     summary: row.analysis.summary,
                  };
               } else {
                  // All nulls, use raw_data
                  analysis = this._extractAnalysisFromRawData(row.raw_data);
               }
            } else {
               // Null or invalid, use raw_data
               analysis = this._extractAnalysisFromRawData(row.raw_data);
            }
         } else {
            // No analysis field, use raw_data
            analysis = this._extractAnalysisFromRawData(row.raw_data);
         }

         // Extract markets from analysis.markets_matched or raw_data
         let markets: EnrichedTweet['markets'] = [];
         if (
            row.analysis?.markets_matched &&
            Array.isArray(row.analysis.markets_matched) &&
            row.analysis.markets_matched.length > 0
         ) {
            markets = row.analysis.markets_matched;
         } else if (
            (row.raw_data as EnrichedTweet)?.markets &&
            Array.isArray((row.raw_data as EnrichedTweet).markets)
         ) {
            markets = (row.raw_data as EnrichedTweet).markets || [];
         }

         return {
            tweetDetails,
            analysis,
            enrichedAt: row.enriched_at as string,
            markets,
         };
      });

      return { data: enrichedTweets, total: count || 0 };
   }

   /**
    * Get a specific tweet with its analysis by Twitter ID or database ID
    */
   async getTweetWithAnalysisById(tweetId: string): Promise<EnrichedTweet> {
      if (!this.supabase) {
         throw new Error('Supabase client not initialized');
      }

      // Determine if input looks like a UUID (contains hyphens) or Twitter ID (numeric string)
      const isUUID = tweetId.includes('-');

      let tweetQuery = this.supabase
         .from('tweets')
         .select('id, tweet_id, raw_data, enriched_at');

      if (isUUID) {
         tweetQuery = tweetQuery.eq('id', tweetId);
      } else {
         tweetQuery = tweetQuery.eq('tweet_id', tweetId);
      }

      const { data: tweetData, error: tweetError } = await tweetQuery.single();

      if (tweetError) {
         if (tweetError.code === 'PGRST116') {
            throw new Error('Tweet not found');
         }
         throw tweetError;
      }

      // Now fetch the analysis for this tweet
      const { data: analysisData, error: analysisError } = await this.supabase
         .from('tweet_analyses')
         .select('*')
         .eq('tweet_id', tweetData.id)
         .eq('analysis_type', 'sentiment')
         .single();

      if (analysisError && analysisError.code !== 'PGRST116') {
         throw analysisError;
      }

      // Extract tweetDetails from raw_data or construct it
      const tweetDetails = (tweetData.raw_data as EnrichedTweet)
         ?.tweetDetails || {
         tweetId: tweetData.tweet_id,
         text: '',
         createdAt: '',
         authorId: '',
         authorUsername: '',
         authorName: '',
         authorAvatarURL: '',
         isRetweet: false,
         isReply: false,
         likeCount: 0,
         retweetCount: 0,
         replyCount: 0,
      };

      // Transform to enriched format
      return {
         tweetDetails,
         analysis: analysisData
            ? {
                 sentiment:
                    (analysisData.sentiment as
                       | 'positive'
                       | 'negative'
                       | 'neutral') || 'neutral',
                 sentiment_score: analysisData.sentiment_score || 0.5,
                 keywords: analysisData.keywords || [],
                 categories: analysisData.categories || [],
                 summary: analysisData.summary || undefined,
              }
            : {
                 sentiment: 'neutral',
                 sentiment_score: 0.5,
                 keywords: [],
                 categories: [],
              },
         enrichedAt: tweetData.enriched_at || new Date().toISOString(),
      };
   }

   /**
    * Insert tweet analysis (original point-in-time)
    */
   async insertAnalysis(
      tweetId: string,
      analysis: TweetAnalysis,
      markets?: EnrichedTweet['markets']
   ): Promise<AnalysisRow> {
      if (!this.supabase) {
         throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase
         .from('tweet_analyses')
         .upsert(
            [
               {
                  tweet_id: tweetId,
                  analysis_type: 'sentiment',
                  analysis_version: 'original',
                  sentiment: analysis.sentiment,
                  sentiment_score: analysis.sentiment_score,
                  keywords: analysis.keywords || [],
                  categories: analysis.categories || [],
                  summary: analysis.summary,
                  raw_analysis: analysis,
                  markets_matched: markets || [],
               },
            ],
            {
               onConflict: 'tweet_id,analysis_type,analysis_version',
            }
         )
         .select()
         .single();

      if (error) throw error;
      return data as AnalysisRow;
   }

   /**
    * Insert refreshed analysis (re-analyzed against current markets)
    */
   async insertRefreshedAnalysis(
      tweetId: string,
      analysis: TweetAnalysis,
      markets: EnrichedTweet['markets'] = []
   ): Promise<AnalysisRow> {
      if (!this.supabase) {
         throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase
         .from('tweet_analyses')
         .upsert(
            [
               {
                  tweet_id: tweetId,
                  analysis_type: 'sentiment',
                  analysis_version: 'refreshed',
                  sentiment: analysis.sentiment,
                  sentiment_score: analysis.sentiment_score,
                  keywords: analysis.keywords || [],
                  categories: analysis.categories || [],
                  summary: analysis.summary,
                  raw_analysis: analysis,
                  markets_matched: markets,
                  refreshed_at: new Date().toISOString(),
               },
            ],
            {
               onConflict: 'tweet_id,analysis_type,analysis_version',
            }
         )
         .select()
         .single();

      if (error) throw error;
      return data as AnalysisRow;
   }

   /**
    * Get tweets that need analysis refresh (older than specified hours)
    */
   async getTweetsNeedingRefresh(
      olderThanHours: number,
      limit = 50
   ): Promise<EnrichedTweet[]> {
      if (!this.supabase) {
         throw new Error('Supabase client not initialized');
      }

      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

      // Get tweets where:
      // 1. No refreshed analysis exists, OR
      // 2. Refreshed analysis is older than cutoff
      const { data, error } = await this.supabase
         .from('tweets')
         .select('raw_data')
         .order('created_at', { ascending: false })
         .limit(limit);

      if (error) throw error;

      // Filter to get tweets needing refresh
      const tweetsNeedingRefresh: EnrichedTweet[] = [];

      for (const row of data || []) {
         if (!row.raw_data) continue;

         const tweet = row.raw_data as EnrichedTweet;
         const dbTweet = await this.getTweetByTwitterId(
            tweet.tweetDetails.tweetId
         );

         // Check if refreshed analysis exists and is recent
         const { data: refreshedAnalysis } = await this.supabase
            .from('tweet_analyses')
            .select('refreshed_at')
            .eq('tweet_id', dbTweet.id)
            .eq('analysis_type', 'sentiment')
            .eq('analysis_version', 'refreshed')
            .single();

         const needsRefresh =
            !refreshedAnalysis ||
            !refreshedAnalysis.refreshed_at ||
            new Date(refreshedAnalysis.refreshed_at) < cutoffTime;

         if (needsRefresh) {
            tweetsNeedingRefresh.push(tweet);
         }
      }

      return tweetsNeedingRefresh;
   }

   /**
    * Search tweets by keyword (returns enriched format)
    */
   async searchTweets(keyword: string, limit = 50): Promise<EnrichedTweet[]> {
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
      return (data || [])
         .map((row) => row.raw_data)
         .filter((tweet): tweet is EnrichedTweet => tweet !== null);
   }

   /**
    * Get tweet statistics
    */
   async getStatistics(): Promise<{
      totalTweets: number;
      totalAnalyses: number;
   }> {
      if (!this.supabase) {
         throw new Error('Supabase client not initialized');
      }

      const [tweetsCount, analysesCount] = await Promise.all([
         this.supabase
            .from('tweets')
            .select('id', { count: 'exact', head: true }),
         this.supabase
            .from('tweet_analyses')
            .select('id', { count: 'exact', head: true }),
      ]);

      return {
         totalTweets: tweetsCount.count || 0,
         totalAnalyses: analysesCount.count || 0,
      };
   }

   /**
    * Extract analysis from raw_data as fallback
    * @private
    */
   private _extractAnalysisFromRawData(rawData: unknown): TweetAnalysis {
      if (!rawData || typeof rawData !== 'object') {
         return {
            sentiment: 'neutral',
            sentiment_score: 0.5,
            keywords: [],
            categories: [],
         };
      }

      const enriched = rawData as EnrichedTweet;
      if (enriched.analysis) {
         return {
            sentiment: enriched.analysis.sentiment || 'neutral',
            sentiment_score: enriched.analysis.sentiment_score || 0.5,
            keywords: enriched.analysis.keywords || [],
            categories: enriched.analysis.categories || [],
            summary: enriched.analysis.summary,
            confidence: enriched.analysis.confidence,
            reasoning: enriched.analysis.reasoning,
            financial_instruments: enriched.analysis.financial_instruments,
            key_entities: enriched.analysis.key_entities,
            market_events: enriched.analysis.market_events,
            betting_keywords: enriched.analysis.betting_keywords,
         };
      }

      return {
         sentiment: 'neutral',
         sentiment_score: 0.5,
         keywords: [],
         categories: [],
      };
   }
}

export default TweetDatabaseService;
