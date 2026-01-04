/**
 * TrendingMarketPoller
 *
 * Polls the MarketCatalogService for market data and processes it into
 * trending and hot markets, then broadcasts to connected WebSocket clients.
 *
 * Similar to the old backend's MarketTrendingPoller but leverages the
 * new MarketCatalogService instead of making direct Polymarket API calls.
 */

import { EventEmitter } from 'events';
import { MarketCatalogService } from '../../types/index.js';
import { ClientWebSocketService } from '../../infrastructure/websocket/clientWebSocket.js';
import { processTrendingData, TrendingData } from './trendingMarketService.js';
import { devLog } from '@/utils/logger.js';

export interface TrendingMarketPollerOptions {
   catalogService: MarketCatalogService;
   clientWS: ClientWebSocketService;
   pollingInterval?: number; // Default: 10000ms (10 seconds)
   log?: {
      info: (message: string, ...args: unknown[]) => void;
      warn: (message: string, ...args: unknown[]) => void;
      error: (message: string, ...args: unknown[]) => void;
      debug: (message: string, ...args: unknown[]) => void;
   };
}

/**
 * Polls for trending and hot markets periodically and broadcasts to WebSocket clients
 */
export class TrendingMarketPoller extends EventEmitter {
   private catalogService: MarketCatalogService;
   private clientWS: ClientWebSocketService;
   private pollingInterval: number;
   private log: TrendingMarketPollerOptions['log'];

   private isRunning: boolean = false;
   private intervalId: NodeJS.Timeout | null = null;
   private lastFetchTime: Date | null = null;
   private lastData: TrendingData | null = null;

   constructor(options: TrendingMarketPollerOptions) {
      super();
      this.catalogService = options.catalogService;
      this.clientWS = options.clientWS;
      this.pollingInterval = options.pollingInterval || 10000; // 10 seconds default
      this.log = options.log || console;
   }

   /**
    * Start polling for trending/hot market updates
    */
   async start(): Promise<void> {
      if (this.isRunning) {
         this.log?.warn('⚠️ Trending market poller is already running');
         return;
      }

      this.isRunning = true;
      this.log?.info(
         `🚀 Starting trending market poller (interval: ${this.pollingInterval}ms)`
      );

      // Fetch immediately on start
      await this.fetchAndBroadcast();

      // Then set up interval
      this.intervalId = setInterval(async () => {
         await this.fetchAndBroadcast();
      }, this.pollingInterval);

      this.emit('started');
   }

   /**
    * Stop polling
    */
   stop(): void {
      if (!this.isRunning) {
         this.log?.warn('⚠️ Trending market poller is not running');
         return;
      }

      if (this.intervalId) {
         clearInterval(this.intervalId);
         this.intervalId = null;
      }

      this.isRunning = false;
      this.log?.info('🛑 Trending market poller stopped');
      this.emit('stopped');
   }

   /**
    * Fetch trending/hot markets from catalog and broadcast to clients
    */
   async fetchAndBroadcast(): Promise<void> {
      try {
         this.log?.debug('📊 Processing trending/hot markets from catalog...');

         // Check if catalog is ready
         if (!this.catalogService.isReady()) {
            this.log?.warn(
               '⚠️ Market catalog not ready yet, skipping this cycle'
            );
            return;
         }

         // Get all markets from the catalog (already filtered and cached)
         const rawMarkets = this.catalogService.getCatalog();

         if (!rawMarkets || rawMarkets.length === 0) {
            this.log?.warn('⚠️ No markets available in catalog');
            return;
         }

         this.log?.debug(
            `✅ Retrieved ${rawMarkets.length} markets from catalog`
         );

         // Process markets into trending and hot categories
         const processedData = processTrendingData(rawMarkets);

         this.log?.debug(
            `📈 Processed: ${processedData.trending.length} trending, ${processedData.hot.length} hot markets`
         );

         // Store last data
         this.lastData = processedData;
         this.lastFetchTime = new Date();

         // Broadcast to all connected clients
         this.broadcastMarketUpdate(processedData);

         this.emit('dataFetched', processedData);
      } catch (error) {
         const errorMessage =
            error instanceof Error ? error.message : String(error);
         this.log?.error(
            '❌ Error processing trending market data:',
            errorMessage
         );
         this.emit('error', error);
      }
   }

   /**
    * Broadcast trending/hot market update to all WebSocket clients
    */
   private broadcastMarketUpdate(data: TrendingData): void {
      const wsStats = this.clientWS.getStats();
      if (!wsStats.isRunning) {
         this.log?.warn(
            '⚠️ WebSocket service not available, skipping broadcast'
         );
         return;
      }

      this.clientWS.broadcastMessage({
         type: 'trendingMarketUpdate',
         data: {
            trending: data.trending,
            hot: data.hot,
            lastUpdated: data.lastUpdated,
         },
         timestamp: new Date().toISOString(),
      });

      devLog(
         `📡 Broadcasted trending market update to ${wsStats.connectedClients} client(s)`
      );
   }

   /**
    * Get the last fetched data
    */
   getLastData(): TrendingData | null {
      return this.lastData;
   }

   /**
    * Get poller status
    */
   getStatus(): {
      isRunning: boolean;
      pollingInterval: number;
      lastFetchTime: Date | null;
      hasData: boolean;
      catalogReady: boolean;
      catalogSize: number;
   } {
      return {
         isRunning: this.isRunning,
         pollingInterval: this.pollingInterval,
         lastFetchTime: this.lastFetchTime,
         hasData: !!this.lastData,
         catalogReady: this.catalogService.isReady(),
         catalogSize: this.catalogService.getCatalog().length,
      };
   }
}
