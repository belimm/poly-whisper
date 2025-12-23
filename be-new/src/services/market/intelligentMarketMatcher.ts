/**
 * Intelligent Market Matcher - TypeScript
 *
 * Uses GPT-4 mini + Market Catalog for smart tweet-to-market matching.
 */

import { OpenAIClient } from '../../infrastructure/client/llmClient.js';
import MarketCatalogService from './marketCatalogService.js';
import type {
   IntelligentMarketMatcherOptions,
   MatchingResult,
   MatchingOptions,
   MatcherStats,
   Logger,
   MarketMatch,
   MarketCatalogRow,
} from '../../types/index.js';

export default class IntelligentMarketMatcher {
   private catalogService: MarketCatalogService;
   private openaiClient: OpenAIClient | null;
   private log: Logger;
   private maxMatches: number;
   private minRelevanceScore: number;
   private useFallback: boolean;

   // Stats
   private stats = {
      totalMatches: 0,
      successfulMatches: 0,
      failedMatches: 0,
      avgRelevanceScore: 0,
      avgMatchingTime: 0,
   };

   constructor(options: IntelligentMarketMatcherOptions = {}) {
      this.catalogService =
         options.catalogService || new MarketCatalogService();
      this.openaiClient = options.openaiClient || null;
      this.log = options.log || console;

      // Configuration
      this.maxMatches = options.maxMatches || 5;
      this.minRelevanceScore = options.minRelevanceScore || 0.5;
      this.useFallback = options.useFallback !== false;

      // Initialize OpenAI client if not provided
      if (!this.openaiClient) {
         try {
            this.openaiClient = new OpenAIClient();
            this.log.info(
               '✅ OpenAI client initialized for intelligent matching'
            );
         } catch (error) {
            this.log.error(
               '❌ Failed to initialize OpenAI client:',
               (error as Error).message
            );
            this.log.warn('⚠️  Intelligent matching will not be available');
         }
      }
   }

   /**
    * Match a tweet to relevant markets using AI + catalog
    */
   async matchTweet(
      tweetText: string,
      options: MatchingOptions = {}
   ): Promise<MatchingResult> {
      const startTime = Date.now();

      try {
         // Validate catalog is ready
         if (!this.catalogService.isReady()) {
            this.log.warn(
               '⚠️  Market catalog not ready, waiting for initialization...'
            );
            // Try fallback if enabled
            if (this.useFallback) {
               return this._fallbackMatch(tweetText);
            }
            throw new Error('Market catalog not ready');
         }

         // Validate OpenAI client
         if (!this.openaiClient) {
            this.log.warn('⚠️  OpenAI client not available');
            if (this.useFallback) {
               return this._fallbackMatch(tweetText);
            }
            throw new Error('OpenAI client not available');
         }

         // Get compact catalog for LLM (reduces token usage)
         const catalog = this.catalogService.getCompactCatalog(this.catalogService.getCatalogSize());

         if (catalog.length === 0) {
            this.log.warn('⚠️  Market catalog is empty');
            if (this.useFallback) {
               return this._fallbackMatch(tweetText);
            }
            throw new Error('Market catalog is empty');
         }

         this.log.info(
            `🔍 Matching tweet against ${catalog.length} markets using GPT-4 mini...`
         );

         // Use OpenAI to match tweet to markets
         const result = await this.openaiClient.matchTweetToMarkets(
            tweetText,
            catalog,
            options.maxMatches || this.maxMatches
         );

         // Filter by minimum relevance score
         const filteredMatches = result.matches.filter(
            (m) =>
               m.relevance_score >=
               (options.minRelevanceScore || this.minRelevanceScore)
         );

         // Update stats
         const matchingTime = Date.now() - startTime;
         this.stats.totalMatches++;
         this.stats.successfulMatches++;
         this.stats.avgMatchingTime =
            (this.stats.avgMatchingTime * (this.stats.totalMatches - 1) +
               matchingTime) /
            this.stats.totalMatches;

         if (filteredMatches.length > 0) {
            const avgScore =
               filteredMatches.reduce((sum, m) => sum + m.relevance_score, 0) /
               filteredMatches.length;
            this.stats.avgRelevanceScore =
               (this.stats.avgRelevanceScore *
                  (this.stats.successfulMatches - 1) +
                  avgScore) /
               this.stats.successfulMatches;
         }

         this.log.info(
            `✅ Found ${filteredMatches.length} relevant markets (${matchingTime}ms)`
         );

         return {
            success: true,
            matches: filteredMatches,
            tweet_summary: result.tweet_summary,
            confidence: result.confidence,
            matching_time: matchingTime,
            source: 'intelligent-gpt4-mini',
            catalog_size: catalog.length,
         };
      } catch (error) {
         this.stats.totalMatches++;
         this.stats.failedMatches++;
         this.log.error(
            '❌ Intelligent matching failed:',
            (error as Error).message
         );

         // Try fallback if enabled
         if (this.useFallback) {
            this.log.info('🔄 Falling back to keyword-based search...');
            return this._fallbackMatch(tweetText);
         }

         return {
            success: false,
            matches: [],
            error: (error as Error).message,
            matching_time: Date.now() - startTime,
            source: 'intelligent-gpt4-mini',
         };
      }
   }

   /**
    * Match multiple tweets in batch
    */
   async matchTweets(tweets: string[]): Promise<MatchingResult[]> {
      this.log.info(`🔍 Batch matching ${tweets.length} tweets...`);

      const results = await Promise.all(
         tweets.map((tweet) => this.matchTweet(tweet))
      );

      const successCount = results.filter((r) => r.success).length;
      this.log.info(
         `✅ Batch matching complete: ${successCount}/${tweets.length} successful`
      );

      return results;
   }

   /**
    * Fallback to simple keyword-based catalog search
    * @private
    */
   private _fallbackMatch(tweetText: string): MatchingResult {
      this.log.info('📝 Using fallback keyword matching...');

      // Extract simple keywords from tweet
      const keywords = this._extractKeywords(tweetText);

      if (keywords.length === 0) {
         return {
            success: false,
            matches: [],
            error: 'No keywords extracted',
            source: 'fallback-keyword',
         };
      }

      // Search catalog for matching markets
      const allMatches: MarketMatch[] = [];
      keywords.forEach((keyword) => {
         const matches = this.catalogService.searchMarkets(keyword);
         matches.forEach((market) => {
            allMatches.push({
               market: market, // Use MarketCatalogRow directly
               relevance_score: 0.5, // Default score for keyword match
               reasoning: `Keyword match: "${keyword}"`,
               keyword: keyword,
            });
         });
      });

      // Deduplicate and sort by volume
      const uniqueMatches = this._deduplicateMatches(allMatches);
      const topMatches = uniqueMatches.slice(0, this.maxMatches);

      return {
         success: true,
         matches: topMatches,
         tweet_summary: `Keywords: ${keywords.join(', ')}`,
         confidence: 0.4, // Lower confidence for fallback
         source: 'fallback-keyword',
         keywords,
      };
   }

   /**
    * Extract keywords from tweet (simple fallback)
    * @private
    */
   private _extractKeywords(text: string): string[] {
      // Extract capitalized words (likely proper nouns)
      const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];

      // Extract ticker-like words (all caps, 2-5 chars)
      const tickers = text.match(/\b[A-Z]{2,5}\b/g) || [];

      // Combine and deduplicate
      const keywords = [...new Set([...properNouns, ...tickers])];

      return keywords.slice(0, 5); // Limit to 5 keywords
   }

   /**
    * Deduplicate matches and combine scores
    * @private
    */
   private _deduplicateMatches(matches: MarketMatch[]): MarketMatch[] {
      const marketMap = new Map<string, MarketMatch>();

      matches.forEach((match) => {
         const marketId =
            match.market.id || (match.market as MarketCatalogRow).id;
         const existingMatch = marketMap.get(marketId);

         if (!existingMatch) {
            marketMap.set(marketId, match);
         } else {
            // If duplicate, keep higher score
            if (match.relevance_score > existingMatch.relevance_score) {
               marketMap.set(marketId, match);
            }
         }
      });

      return Array.from(marketMap.values()).sort(
         (a, b) => b.relevance_score - a.relevance_score
      );
   }

   /**
    * Get matching statistics
    */
   getStats(): MatcherStats {
      return {
         ...this.stats,
         catalogReady: this.catalogService.isReady(),
         catalogSize: this.catalogService.getCatalog().length,
         openaiAvailable: !!this.openaiClient,
      };
   }

   /**
    * Check if intelligent matching is available
    */
   isAvailable(): boolean {
      return this.catalogService.isReady() && !!this.openaiClient;
   }
}
