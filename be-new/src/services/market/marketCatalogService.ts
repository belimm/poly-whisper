/**
 * Market Catalog Service (Updated) - TypeScript
 *
 * Manages a complete catalog of active Polymarket markets with Supabase persistence.
 */

import { supabaseAdmin } from '../../infrastructure/database/supabaseClient.js';
import type {
   MarketCatalogRow,
   MarketCatalogServiceOptions,
   CatalogStats,
   PolymarketMarket,
   MarketTag,
   CompactMarket,
   Logger,
} from '../../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export default class MarketCatalogService {
   private supabase: SupabaseClient;
   private log: Logger;
   private refreshInterval: number;
   private minVolume: number;
   private minLiquidity: number;
   private batchSize: number;
   private cleanupMargin: number;
   private apiBaseUrl: string;
   private maxRetries: number;
   private retryDelay: number;

   // In-memory cache for fast reads
   private cache: MarketCatalogRow[] = [];
   private cacheMap = new Map<string, MarketCatalogRow>(); // For O(1) lookups by ID

   // State
   private lastRefresh: string | null = null;
   private isRefreshing = false;
   private refreshHandle: NodeJS.Timeout | null = null;

   // Performance metrics
   private stats = {
      totalMarkets: 0,
      lastRefreshDuration: 0,
      lastFetchDuration: 0,
      lastWriteDuration: 0,
      lastCleanupDuration: 0,
      refreshCount: 0,
      errors: 0,
      lastError: null as string | null,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      totalApiTime: 0,
      avgApiTime: 0,
      marketsFetched: 0,
      marketsWritten: 0,
      marketsDeleted: 0,
   };

   constructor(options: MarketCatalogServiceOptions = {}) {
      this.supabase = (options.supabase || supabaseAdmin) as SupabaseClient;
      this.log = options.log || console;

      // Configuration
      this.refreshInterval = options.refreshInterval || 5 * 60 * 1000; // 5 minutes default
      this.minVolume = options.minVolume || 10000; // Minimum volume filter
      this.minLiquidity = options.minLiquidity || 500; // Minimum liquidity filter
      this.batchSize = options.batchSize || 100; // Batch size for Supabase inserts
      this.cleanupMargin = options.cleanupMargin || 10; // Delete data older than 10 minutes
      this.apiBaseUrl =
         options.apiBaseUrl || 'https://gamma-api.polymarket.com';
      this.maxRetries = options.maxRetries || 3;
      this.retryDelay = options.retryDelay || 1000;

      if (!this.supabase) {
         throw new Error(
            'Supabase client is required but not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
         );
      }
   }

   /**
    * Start the catalog service with auto-refresh
    */
   async start(): Promise<void> {
      this.log.info('🚀 Starting Market Catalog Service (Updated)...');
      this.log.info(
         `📊 Configuration: ${
            this.refreshInterval / 60000
         } min refresh, min volume: $${this.minVolume.toLocaleString()}`
      );

      // Load initial cache from Supabase
      await this.loadCacheFromDatabase();

      // Run first refresh
      await this.refresh();

      // Schedule periodic refreshes
      this.refreshHandle = setInterval(() => {
         this.refresh().catch((err: Error) => {
            this.log.error('❌ Scheduled catalog refresh failed:', err.message);
         });
      }, this.refreshInterval);

      this.log.info(
         `✅ Market Catalog Service started (refresh every ${
            this.refreshInterval / 60000
         } minutes)`
      );
   }

   /**
    * Stop the catalog service
    */
   stop(): void {
      if (this.refreshHandle) {
         clearInterval(this.refreshHandle);
         this.refreshHandle = null;
      }
      this.log.info('⏹️  Market Catalog Service stopped');
   }

   getCatalogSize(): number {
      return this.cache.length;
   }

   /**
    * Load cache from Supabase database
    */
   async loadCacheFromDatabase(): Promise<void> {
      try {
         this.log.info('📥 Loading market catalog from database...');

         const { data, error } = await this.supabase
            .from('market_catalog')
            .select('*')
            .eq('active', true)
            .order('volume_num', { ascending: false });

         if (error) {
            throw error;
         }

         if (data && data.length > 0) {
            this.cache = data as MarketCatalogRow[];
            this.cacheMap.clear();
            data.forEach((market) =>
               this.cacheMap.set(market.id, market as MarketCatalogRow)
            );

            this.log.info(
               `✅ Loaded ${data.length} markets from database into cache`
            );
            this.stats.totalMarkets = data.length;
         } else {
            this.log.warn(
               '⚠️  No markets found in database. Will fetch from API.'
            );
         }
      } catch (error) {
         this.log.error(
            '❌ Failed to load cache from database:',
            (error as Error).message
         );
         // Don't throw - we'll fetch fresh data on refresh
      }
   }

   /**
    * Manually trigger a catalog refresh
    */
   async refresh(): Promise<void> {
      if (this.isRefreshing) {
         this.log.warn('⚠️  Catalog refresh already in progress, skipping...');
         return;
      }

      this.isRefreshing = true;
      const refreshStartTime = Date.now();
      const refreshTimestamp = new Date();

      try {
         this.log.info('🔄 Refreshing market catalog from Polymarket API...');

         // Step 1: Fetch all markets from Polymarket API (with timing)
         const fetchStartTime = Date.now();
         const allMarkets = await this._fetchAllMarketsFromAPI();
         const fetchDuration = Date.now() - fetchStartTime;
         this.stats.lastFetchDuration = fetchDuration;
         this.stats.marketsFetched = allMarkets.length;

         this.log.info(
            `📊 Fetched ${allMarkets.length} markets in ${fetchDuration}ms (${(
               fetchDuration / 1000
            ).toFixed(2)}s)`
         );

         // Step 2: Filter and transform markets
         const processedMarkets = this._processMarkets(
            allMarkets,
            refreshTimestamp
         );
         this.log.info(
            `✅ Processed ${processedMarkets.length} markets (filtered by volume/liquidity)`
         );

         if (processedMarkets.length === 0) {
            this.log.warn(
               '⚠️  No markets passed filters. Skipping database update.'
            );
            return;
         }

         // Step 3: Write to Supabase (UPSERT with new timestamp) - with timing
         const writeStartTime = Date.now();
         await this._writeToDatabase(processedMarkets);
         const writeDuration = Date.now() - writeStartTime;
         this.stats.lastWriteDuration = writeDuration;
         this.stats.marketsWritten = processedMarkets.length;
         this.log.info(
            `💾 Written ${processedMarkets.length} markets to database in ${writeDuration}ms`
         );

         // Step 4: Update in-memory cache
         this.cache = processedMarkets;
         this.cacheMap.clear();
         processedMarkets.forEach((market) =>
            this.cacheMap.set(market.id, market)
         );
         this.log.info(
            `🔄 Updated in-memory cache with ${processedMarkets.length} markets`
         );

         // Step 5: Cleanup old data (only AFTER successful write) - with timing
         const cleanupStartTime = Date.now();
         const deletedCount = await this._cleanupOldData(this.cleanupMargin);
         const cleanupDuration = Date.now() - cleanupStartTime;
         this.stats.lastCleanupDuration = cleanupDuration;
         this.stats.marketsDeleted = deletedCount;
         this.log.info(
            `🗑️  Cleaned up ${deletedCount} old markets in ${cleanupDuration}ms`
         );

         // Update stats
         const totalDuration = Date.now() - refreshStartTime;
         this.lastRefresh = refreshTimestamp.toISOString();
         this.stats.totalMarkets = processedMarkets.length;
         this.stats.refreshCount++;
         this.stats.lastRefreshDuration = totalDuration;
         this.stats.lastError = null;

         // Calculate average API time
         if (this.stats.apiCalls > 0) {
            this.stats.avgApiTime =
               this.stats.totalApiTime / this.stats.apiCalls;
         }

         this.log.info(
            `✅ Catalog refresh completed in ${totalDuration}ms (${(
               totalDuration / 1000
            ).toFixed(2)}s)`
         );
         this.log.info(
            `📈 Performance: Fetch: ${fetchDuration}ms, Write: ${writeDuration}ms, Cleanup: ${cleanupDuration}ms`
         );

         // Log timing analysis
         if (totalDuration > 30000) {
            this.log.warn(
               `⚠️  Refresh took ${(totalDuration / 1000).toFixed(
                  2
               )}s - consider optimizing`
            );
         } else {
            this.log.info(
               `✅ Refresh timing is good (${(totalDuration / 1000).toFixed(
                  2
               )}s < 30s threshold)`
            );
         }
      } catch (error) {
         this.stats.errors++;
         this.stats.lastError = (error as Error).message;
         this.log.error('❌ Catalog refresh failed:', (error as Error).message);
         throw error;
      } finally {
         this.isRefreshing = false;
      }
   }

   /**
    * Fetch all markets from Polymarket API using new endpoint
    * @private
    */
   private async _fetchAllMarketsFromAPI(): Promise<PolymarketMarket[]> {
      const allMarkets: PolymarketMarket[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 3;

      while (hasMore) {
         try {
            const apiStartTime = Date.now();

            // NEW ENDPOINT: includes tags and volume filter
            const url = `${this.apiBaseUrl}/markets?closed=false&include_tag=true&volume_num_min=${this.minVolume}&limit=${limit}&offset=${offset}`;

            const res = await fetch(url, { method: 'GET' });

            const apiDuration = Date.now() - apiStartTime;
            this.stats.apiCalls++;
            this.stats.totalApiTime += apiDuration;

            if (!res.ok) {
               throw new Error(`API returned ${res.status}: ${res.statusText}`);
            }

            const batch = (await res.json()) as PolymarketMarket[];

            if (!Array.isArray(batch) || batch.length === 0) {
               hasMore = false;
            } else {
               allMarkets.push(...batch);
               offset += batch.length;
               consecutiveErrors = 0; // Reset error counter on success

               this.log.debug?.(
                  `📥 Fetched batch: ${batch.length} markets (offset: ${offset}, time: ${apiDuration}ms)`
               );

               // Stop if we got fewer results than requested (last page)
               if (batch.length < limit) {
                  hasMore = false;
               }

               // Rate limiting - small delay between requests
               if (hasMore) {
                  await new Promise((resolve) => setTimeout(resolve, 100));
               }
            }
         } catch (error) {
            consecutiveErrors++;
            this.log.error(
               `❌ Error fetching markets batch at offset ${offset}:`,
               (error as Error).message
            );

            if (consecutiveErrors >= maxConsecutiveErrors) {
               this.log.error(
                  `❌ Too many consecutive errors (${consecutiveErrors}). Stopping fetch.`
               );
               hasMore = false;
            } else {
               // Wait a bit before retrying with exponential backoff
               const backoffDelay =
                  this.retryDelay * Math.pow(2, consecutiveErrors - 1);
               await new Promise((resolve) =>
                  setTimeout(resolve, backoffDelay)
               );
            }
         }
      }

      return allMarkets;
   }

   /**
    * Process and filter markets
    * @private
    */
   private _processMarkets(
      markets: PolymarketMarket[],
      refreshTimestamp: Date
   ): MarketCatalogRow[] {
      return markets
         .filter((market) => this._shouldIncludeMarket(market))
         .map((market) => this._transformMarket(market, refreshTimestamp));
   }

   /**
    * Check if market should be included in catalog
    * @private
    */
   private _shouldIncludeMarket(market: PolymarketMarket): boolean {
      // Must be active
      if (market.closed || !market.active) return false;

      // Must have a question
      if (!market.question) return false;

      // Volume filter
      const volume = parseFloat(String(market.volumeNum || market.volume || 0));
      if (volume < this.minVolume) return false;

      // Liquidity filter
      const liquidity = parseFloat(
         String(market.liquidity || market.liquidityNum || 0)
      );
      if (liquidity < this.minLiquidity) return false;

      // Filter out expired markets
      if (market.endDate) {
         const endDate = new Date(market.endDate).getTime();
         if (endDate < Date.now()) return false;
      }

      return true;
   }

   /**
    * Transform market data for database storage
    * @private
    */
   private _transformMarket(
      market: PolymarketMarket,
      refreshTimestamp: Date
   ): MarketCatalogRow {
      // Extract category and tags from API response
      let category = 'other';
      let tags: MarketTag[] = [];

      // Handle tags - they should be included in the response now (include_tag=true)
      if (market.tags && Array.isArray(market.tags) && market.tags.length > 0) {
         tags = market.tags.map((t) => ({
            id: String(t.id || ''),
            label: String(t.label || ''),
            slug: String(t.slug || ''),
         }));
         category = String(market.tags[0].slug || market.category || 'other');
      } else if (market.category) {
         // Fallback to category field if tags not available
         category = String(market.category);
      }

      // Handle outcomes - can be string or array
      let outcomes: string[] = ['Yes', 'No'];
      if (market.outcomes) {
         if (typeof market.outcomes === 'string') {
            try {
               outcomes = JSON.parse(market.outcomes) as string[];
            } catch {
               outcomes = ['Yes', 'No'];
            }
         } else if (Array.isArray(market.outcomes)) {
            outcomes = market.outcomes.map(String);
         }
      }

      // Handle outcome prices - can be string or array
      let outcomePrices: string[] = ['0.5', '0.5'];
      if (market.outcomePrices) {
         if (typeof market.outcomePrices === 'string') {
            try {
               outcomePrices = JSON.parse(market.outcomePrices) as string[];
            } catch {
               outcomePrices = ['0.5', '0.5'];
            }
         } else if (Array.isArray(market.outcomePrices)) {
            outcomePrices = market.outcomePrices.map(String);
         }
      }

      return {
         // Primary fields
         // Note: id = event_id, question = event_title, slug = event_slug
         id: String(market.id),
         question: String(market.question),
         slug: market.slug || null,

         // Numeric fields
         volume_num: parseFloat(String(market.volumeNum || market.volume || 0)),
         liquidity: parseFloat(
            String(market.liquidity || market.liquidityNum || 0)
         ),
         volume_24hr: parseFloat(String(market.volume24hr || 0)),
         volume_1wk: parseFloat(String(market.volume1wk || 0)),
         volume_1mo: parseFloat(String(market.volume1mo || 0)),

         // Price changes
         one_day_price_change: parseFloat(
            String(market.oneDayPriceChange || 0)
         ),
         one_week_price_change: parseFloat(
            String(market.oneWeekPriceChange || 0)
         ),
         one_month_price_change: parseFloat(
            String(market.oneMonthPriceChange || 0)
         ),

         // Outcomes (store as JSON string for consistency)
         outcomes: JSON.stringify(outcomes),
         outcome_prices: JSON.stringify(outcomePrices),

         // Status
         active: market.active !== false,
         closed: market.closed === true,
         archived: market.archived === true,

         // Dates
         end_date: market.endDate || null,
         start_date: market.startDate || null,

         // Tags and category
         tags: tags,
         category,

         // Store only events array in market_data (instead of full market object)
         // This reduces storage size while keeping essential event information
         market_data: {
            events: market.events || [],
            // Include a few other useful fields that might not be in the main columns
            conditionId: market.conditionId || null,
            questionID: market.questionID || null,
            resolutionSource: market.resolutionSource || null,
            description: market.description || null,
            image: market.image || null,
            icon: market.icon || null,
         } as Record<string, unknown>,

         // Timestamps
         refreshed_at: refreshTimestamp.toISOString(),
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
      };
   }

   /**
    * Write markets to Supabase in batches
    * @private
    */
   private async _writeToDatabase(markets: MarketCatalogRow[]): Promise<void> {
      // Split into batches
      const batches: MarketCatalogRow[][] = [];
      for (let i = 0; i < markets.length; i += this.batchSize) {
         batches.push(markets.slice(i, i + this.batchSize));
      }

      this.log.info(
         `📝 Writing ${markets.length} markets in ${batches.length} batches...`
      );

      for (let i = 0; i < batches.length; i++) {
         const batch = batches[i];

         try {
            const { error } = await this.supabase
               .from('market_catalog')
               .upsert(batch, {
                  onConflict: 'id',
                  ignoreDuplicates: false,
               });

            if (error) {
               throw error;
            }

            this.log.debug?.(
               `✅ Batch ${i + 1}/${batches.length} written (${
                  batch.length
               } markets)`
            );
         } catch (error) {
            this.log.error(
               `❌ Failed to write batch ${i + 1}:`,
               (error as Error).message
            );
            throw error;
         }
      }
   }

   /**
    * Cleanup old market data from database
    * @private
    */
   private async _cleanupOldData(olderThanMinutes: number): Promise<number> {
      try {
         // Calculate cutoff time
         const cutoffTime = new Date(
            Date.now() - olderThanMinutes * 60 * 1000
         ).toISOString();

         const { error, count } = await this.supabase
            .from('market_catalog')
            .delete({ count: 'exact' })
            .lt('refreshed_at', cutoffTime);

         if (error) {
            throw error;
         }

         return count || 0;
      } catch (error) {
         this.log.error(
            '❌ Failed to cleanup old data:',
            (error as Error).message
         );
         // Don't throw - cleanup failure is not critical
         return 0;
      }
   }

   /**
    * Get the full catalog from in-memory cache
    */
   getCatalog(): MarketCatalogRow[] {
      return this.cache;
   }

   /**
    * Get a market by ID (O(1) lookup)
    */
   getMarketById(id: string): MarketCatalogRow | null {
      const market = this.cacheMap.get(id);
      if (market) {
         this.stats.cacheHits++;
      } else {
         this.stats.cacheMisses++;
      }
      return market || null;
   }

   /**
    * Get a compact version of the catalog for LLM prompts
    */
   getCompactCatalog(maxMarkets = 500): CompactMarket[] {
      return this.cache.slice(0, maxMarkets).map((market) => {
         // Parse outcomes if stored as string
         let outcomes: string[] = ['Yes', 'No'];
         if (typeof market.outcomes === 'string') {
            try {
               outcomes = JSON.parse(market.outcomes) as string[];
            } catch {
               outcomes = ['Yes', 'No'];
            }
         }

         // Parse outcome prices if stored as string
         let outcomePrices: string[] = ['0.5', '0.5'];
         if (typeof market.outcome_prices === 'string') {
            try {
               outcomePrices = JSON.parse(market.outcome_prices) as string[];
            } catch {
               outcomePrices = ['0.5', '0.5'];
            }
         }

         return {
            id: market.id,
            question: market.question,
            category: market.category,
            probability: Math.round(
               parseFloat(outcomePrices[0] || '0.5') * 100
            ),
            volume: Math.round(market.volume_num),
            tags: (market.tags || []).map((t) =>
               typeof t === 'object' ? t.slug : String(t)
            ),
         };
      });
   }

   /**
    * Filter markets by category
    */
   getMarketsByCategory(category: string): MarketCatalogRow[] {
      return this.cache.filter((m) => m.category === category);
   }

   /**
    * Filter markets by tag
    */
   getMarketsByTag(tag: string): MarketCatalogRow[] {
      return this.cache.filter((m) =>
         (m.tags || []).some((t) => {
            const tagSlug = typeof t === 'object' ? t.slug : String(t);
            return tagSlug === tag;
         })
      );
   }

   /**
    * Get top markets by volume
    */
   getTopMarkets(limit = 100): MarketCatalogRow[] {
      return this.cache.slice(0, limit);
   }

   /**
    * Simple text search in questions
    */
   searchMarkets(query: string): MarketCatalogRow[] {
      const lowerQuery = query.toLowerCase();
      return this.cache.filter((m) =>
         m.question.toLowerCase().includes(lowerQuery)
      );
   }

   /**
    * Get catalog statistics including timing metrics
    */
   getStats(): CatalogStats {
      return {
         ...this.stats,
         lastRefresh: this.lastRefresh,
         isRefreshing: this.isRefreshing,
         catalogSize: this.cache.length,
         cacheMapSize: this.cacheMap.size,
         nextRefreshIn: this.refreshHandle ? this.refreshInterval : null,
         // Performance metrics
         avgApiCallTime: this.stats.avgApiTime,
         totalApiCalls: this.stats.apiCalls,
         refreshIntervalMinutes: this.refreshInterval / 60000,
      };
   }

   /**
    * Check if catalog is ready
    */
   isReady(): boolean {
      return this.cache.length > 0 && !this.isRefreshing;
   }
}
