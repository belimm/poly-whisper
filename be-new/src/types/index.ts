/**
 * Type definitions for Poly-Whisper Backend
 */

import { WebSocket, WebSocketServer } from 'ws';
import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import type { Server } from 'http';

// ============================================================================
// Database Types
// ============================================================================

export interface MarketCatalogRow {
   id: string; // Same as event_id
   question: string; // Same as event_title
   slug: string | null; // Same as event_slug
   volume_num: number;
   liquidity: number;
   volume_24hr: number;
   volume_1wk: number;
   volume_1mo: number;
   one_day_price_change: number;
   one_week_price_change: number;
   one_month_price_change: number;
   outcomes: string; // JSON string
   outcome_prices: string; // JSON string
   active: boolean;
   closed: boolean;
   archived: boolean;
   end_date: string | null;
   start_date: string | null;
   tags: MarketTag[];
   category: string;
   market_data: Record<string, unknown>; // JSONB
   refreshed_at: string;
   created_at: string;
   updated_at: string;
}

export interface MarketTag {
   id: string;
   label: string;
   slug: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PolymarketEvent {
   id: string;
   title: string;
   slug: string;
   ticker?: string;
   description?: string;
   resolutionSource?: string;
   startDate?: string;
   creationDate?: string;
   endDate?: string;
   image?: string;
   icon?: string;
   active?: boolean;
   closed?: boolean;
   archived?: boolean;
   featured?: boolean;
   restricted?: boolean;
   liquidity?: number;
   volume?: number;
   openInterest?: number;
   createdAt?: string;
   updatedAt?: string;
   competitive?: number;
   volume24hr?: number;
   volume1wk?: number;
   volume1mo?: number;
   volume1yr?: number;
   enableOrderBook?: boolean;
   liquidityClob?: number;
   commentCount?: number;
   cyom?: boolean;
   showAllOutcomes?: boolean;
   showMarketImages?: boolean;
   enableNegRisk?: boolean;
   automaticallyActive?: boolean;
   negRiskAugmented?: boolean;
   pendingDeployment?: boolean;
   deploying?: boolean;
   requiresTranslation?: boolean;
   [key: string]: unknown;
}

export interface PolymarketMarket {
   id: string;
   question: string;
   slug?: string;
   conditionId?: string;
   eventId?: string; // Deprecated - use events[0].id instead
   eventTitle?: string; // Deprecated - use events[0].title instead
   eventSlug?: string; // Deprecated - use events[0].slug instead
   events?: PolymarketEvent[]; // Array of events (first one is usually the main event)
   volumeNum?: number;
   volume?: string | number;
   liquidity?: string | number;
   liquidityNum?: number;
   volume24hr?: number;
   volume1wk?: number;
   volume1mo?: number;
   oneDayPriceChange?: number;
   oneWeekPriceChange?: number;
   oneMonthPriceChange?: number;
   outcomes?: string | string[];
   outcomePrices?: string | string[];
   active?: boolean;
   closed?: boolean;
   archived?: boolean;
   endDate?: string;
   startDate?: string;
   tags?: MarketTag[];
   category?: string;
   description?: string;
   image?: string;
   icon?: string;
   resolutionSource?: string;
   questionID?: string;
   [key: string]: unknown; // For additional fields
}

// ============================================================================
// Tweet Types
// ============================================================================

export interface TweetDetails {
   tweetId: string;
   text: string;
   createdAt: string;
   authorId: string;
   authorUsername: string;
   authorName: string;
   authorAvatarURL: string;
   isRetweet: boolean;
   isReply: boolean;
   likeCount: number;
   retweetCount: number;
   replyCount: number;
   url?: string;
   receivedAtMs?: number;
}

export interface TweetAnalysis {
   sentiment: 'positive' | 'negative' | 'neutral';
   sentiment_score: number;
   keywords: string[];
   categories: string[];
   summary?: string;
   confidence?: number;
   reasoning?: string;
   financial_instruments?: string[];
   key_entities?: string[];
   market_events?: string[];
   betting_keywords?: string[];
}

export interface EnrichedTweet {
   tweetDetails: TweetDetails;
   analysis: TweetAnalysis;
   enrichedAt: string;
   markets?: MarketMatch[];
   analysisRefreshedAt?: string; // Timestamp when analysis was last refreshed
}

// ============================================================================
// Market Matching Types
// ============================================================================

export interface MarketMatch {
   market: MarketCatalogRow | PolymarketMarket;
   relevance_score: number;
   reasoning: string;
   keyword?: string;
}

export interface MatchingResult {
   success: boolean;
   matches: MarketMatch[];
   tweet_summary?: string;
   confidence?: number;
   matching_time?: number;
   source: 'intelligent-gpt4-mini' | 'fallback-keyword' | 'legacy-keyword';
   catalog_size?: number;
   error?: string;
   keywords?: string[];
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface TwitterWebSocketMessage {
   event_type: 'connected' | 'ping' | 'tweet' | string;
   tweets?: TwitterRawTweet[];
   timestamp?: number;
   [key: string]: unknown;
}

export interface TwitterRawTweet {
   id: string;
   text: string;
   createdAt: string;
   author?: {
      id: string;
      userName: string;
      name: string;
      profilePicture?: string;
      twitterUrl?: string;
   };
   retweeted_tweet?: unknown;
   isReply?: boolean;
   likeCount?: number;
   retweetCount?: number;
   replyCount?: number;
}

export interface ClientWebSocketMessage {
   type:
      | 'welcome'
      | 'newTweet'
      | 'system'
      | 'stats'
      | 'error'
      | 'pong'
      | 'subscribed'
      | 'marketUpdate';
   message?: string;
   data?: unknown;
   level?: 'info' | 'warning' | 'error';
   timestamp?: string;
   clientId?: string;
}

export interface ClientSubscription {
   keywords?: string[];
   categories?: string[];
   sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface WebSocketClient {
   ws: WebSocket;
   userAgent: string;
   ip: string;
   origin: string;
   connectedAt: string;
   subscription?: ClientSubscription;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface MarketCatalogServiceOptions {
   supabase?: SupabaseClient;
   log?: Logger;
   refreshInterval?: number;
   minVolume?: number;
   minLiquidity?: number;
   batchSize?: number;
   cleanupMargin?: number;
   apiBaseUrl?: string;
   maxRetries?: number;
   retryDelay?: number;
}

export interface IntelligentMarketMatcherOptions {
   catalogService?: MarketCatalogService;
   openaiClient?: OpenAIClient;
   log?: Logger;
   maxMatches?: number;
   minRelevanceScore?: number;
   useFallback?: boolean;
}

export interface MarketMatchingServiceOptions {
   polymarket?: PolymarketService;
   cache?: MarketCacheService;
   intelligentMatcher?: IntelligentMarketMatcher;
   log?: Logger;
   maxMarketsPerKeyword?: number;
   useIntelligentMode?: boolean;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface Logger {
   info: (message: string, ...args: unknown[]) => void;
   warn: (message: string, ...args: unknown[]) => void;
   error: (message: string, ...args: unknown[]) => void;
   debug: (message: string, ...args: unknown[]) => void;
}

export interface MarketCatalogService {
   start: () => Promise<void>;
   stop: () => void;
   refresh: () => Promise<void>;
   getCatalog: () => MarketCatalogRow[];
   getMarketById: (id: string) => MarketCatalogRow | null;
   getCompactCatalog: (maxMarkets?: number) => CompactMarket[];
   getStats: () => CatalogStats;
   isReady: () => boolean;
}

export interface IntelligentMarketMatcher {
   matchTweet: (
      tweetText: string,
      options?: MatchingOptions
   ) => Promise<MatchingResult>;
   matchTweets: (tweets: string[]) => Promise<MatchingResult[]>;
   getStats: () => MatcherStats;
   isAvailable: () => boolean;
}

export interface MatchingOptions {
   maxMatches?: number;
   minRelevanceScore?: number;
}

export interface CompactMarket {
   id: string;
   question: string;
   category: string;
   probability: number;
   volume: number;
   tags: string[];
}

export interface CatalogStats {
   totalMarkets: number;
   lastRefreshDuration: number;
   lastFetchDuration: number;
   lastWriteDuration: number;
   lastCleanupDuration: number;
   refreshCount: number;
   errors: number;
   lastError: string | null;
   cacheHits: number;
   cacheMisses: number;
   apiCalls: number;
   totalApiTime: number;
   avgApiTime: number;
   marketsFetched: number;
   marketsWritten: number;
   marketsDeleted: number;
   lastRefresh: string | null;
   isRefreshing: boolean;
   catalogSize: number;
   cacheMapSize: number;
   nextRefreshIn: number | null;
   avgApiCallTime: number;
   totalApiCalls: number;
   refreshIntervalMinutes: number;
}

export interface MatcherStats {
   totalMatches: number;
   successfulMatches: number;
   failedMatches: number;
   avgRelevanceScore: number;
   avgMatchingTime: number;
   catalogReady: boolean;
   catalogSize: number;
   openaiAvailable: boolean;
}

// ============================================================================
// Express Types
// ============================================================================

export interface AppLocals {
   tweets: EnrichedTweet[];
   twitterWS: TwitterWebSocketService;
   clientWS: ClientWebSocketService;
   tweetAnalyzer: TweetAnalyzer;
   tweetDB: TweetDatabaseService;
   tweetQueue: TweetProcessingQueue;
   marketMatcher: MarketMatchingService;
   marketCatalogService: MarketCatalogService;
   intelligentMatcher: IntelligentMarketMatcher;
}

// Service interfaces
export interface TweetAnalyzer {
   analyzeWithLLM: (text: string) => Promise<TweetAnalysis>;
   analyzeTweet: (text: string) => TweetAnalysis;
}

export interface TweetDatabaseService {
   insertTweet: (enrichedTweet: EnrichedTweet) => Promise<unknown>;
   insertAnalysis: (
      tweetId: string,
      analysis: TweetAnalysis
   ) => Promise<unknown>;
   getLatestTweets: (
      limit?: number,
      offset?: number
   ) => Promise<{ tweets: EnrichedTweet[]; total: number }>;
   getTweetsWithAnalyses: (
      limit?: number,
      offset?: number
   ) => Promise<{ data: EnrichedTweet[]; total: number }>;
   getTweetWithAnalysisById: (tweetId: string) => Promise<EnrichedTweet>;
   searchTweets: (keyword: string, limit?: number) => Promise<EnrichedTweet[]>;
   getStatistics: () => Promise<{ totalTweets: number; totalAnalyses: number }>;
}

export interface TweetProcessingQueue {
   addTweet: (tweet: EnrichedTweet) => boolean;
   drain: () => Promise<void>;
   [key: string]: unknown;
}

export interface PolymarketService {
   search: (
      query: string,
      options?: { size?: number; page?: number }
   ) => Promise<unknown>;
   [key: string]: unknown;
}

export interface MarketCacheService {
   get: (key: string) => unknown;
   set: (key: string, value: unknown) => void;
   clear: (key: string) => void;
   clearAll: () => void;
   getStats: () => unknown;
   batchGet: (keys: string[]) => Record<string, unknown>;
   [key: string]: unknown;
}

export interface MarketMatchingService {
   matchTweet: (
      tweet: EnrichedTweet,
      options?: MatchingOptions
   ) => Promise<MatchingResult>;
   getMatchingStats: () => {
      intelligentMatches: number;
      legacyMatches: number;
      totalMatches: number;
      intelligentModeEnabled: boolean;
      intelligentMatcherAvailable: boolean;
      intelligentMatcherStats: MatcherStats | null;
   };
}

export interface OpenAIClient {
   matchTweetToMarkets: (
      tweetText: string,
      marketCatalog: CompactMarket[],
      maxMatches?: number
   ) => Promise<MatchingResult>;
   analyzeTweet: (tweetText: string) => Promise<TweetAnalysis>;
}

export interface TwitterWebSocketService extends EventEmitter {
   connect: () => void;
   disconnect: () => void;
   getConnectionStatus: () => {
      isConnected: boolean;
      reconnectAttempts: number;
      readyState: number | null;
   };
}

export interface ClientWebSocketService extends EventEmitter {
   createServer: (server: Server) => WebSocketServer;
   broadcastTweet: (tweet: EnrichedTweet) => void;
   broadcastSystemMessage: (
      message: string,
      type?: 'info' | 'warning' | 'error'
   ) => void;
   broadcastMessage: (message: ClientWebSocketMessage) => void;
   getStats: () => {
      isRunning: boolean;
      connectedClients: number;
      clients: Array<{
         connectedAt: string;
         subscription: ClientSubscription | null;
      }>;
   };
   close: () => void;
}
