import { EventEmitter } from 'events';
import { processTrendingData } from './trendingService.js';
import { devLog, errorLog, infoLog } from '../../utils/logger.js';

/**
 * Polls Polymarket for popular markets every 10 seconds
 * Processes them into trending and hot markets
 * Broadcasts results to connected clients via WebSocket
 */
class MarketTrendingPoller extends EventEmitter {
   constructor({ polymarketService, clientWS, pollingInterval = 10000 }) {
      super();
      this.polymarket = polymarketService;
      this.clientWS = clientWS;
      this.pollingInterval = pollingInterval;
      this.isRunning = false;
      this.intervalId = null;
      this.lastFetchTime = null;
      this.lastData = null;
   }

   /**
    * Start polling for market updates
    */
   async start() {
      if (this.isRunning) {
         devLog('⚠️ Market trending poller is already running');
         return;
      }

      this.isRunning = true;
      infoLog(
         `🚀 Starting market trending poller (interval: ${this.pollingInterval}ms)`
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
   stop() {
      if (!this.isRunning) {
         devLog('⚠️ Market trending poller is not running');
         return;
      }

      if (this.intervalId) {
         clearInterval(this.intervalId);
         this.intervalId = null;
      }

      this.isRunning = false;
      infoLog('🛑 Market trending poller stopped');
      this.emit('stopped');
   }

   /**
    * Fetch popular markets and broadcast to clients
    */
   async fetchAndBroadcast() {
      try {
         devLog('📊 Fetching popular markets from Polymarket...');

         // Fetch popular markets from Polymarket
         const rawMarkets = await this.polymarket.getPopularMarkets();

         if (!rawMarkets || rawMarkets.length === 0) {
            devLog('⚠️ No markets returned from Polymarket');
            return;
         }

         devLog(`✅ Received ${rawMarkets.length} markets from Polymarket`);

         // Process markets into trending and hot categories
         const processedData = processTrendingData(rawMarkets);

         devLog(
            `📈 Processed: ${processedData.trending.length} trending, ${processedData.hot.length} hot markets`
         );

         // Store last data
         this.lastData = processedData;
         this.lastFetchTime = new Date();

         // Broadcast to all connected clients
         this.broadcastMarketUpdate(processedData);

         this.emit('dataFetched', processedData);
      } catch (error) {
         errorLog('❌ Error fetching market data:', error.message);
         this.emit('error', error);
      }
   }

   /**
    * Broadcast market update to all WebSocket clients
    */
   broadcastMarketUpdate(data) {
      if (!this.clientWS || !this.clientWS.isRunning) {
         devLog('⚠️ WebSocket service not available, skipping broadcast');
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
         `📡 Broadcasted market update to ${this.clientWS.clients.size} client(s)`
      );
   }

   /**
    * Get the last fetched data
    */
   getLastData() {
      return this.lastData;
   }

   /**
    * Get poller status
    */
   getStatus() {
      return {
         isRunning: this.isRunning,
         pollingInterval: this.pollingInterval,
         lastFetchTime: this.lastFetchTime,
         hasData: !!this.lastData,
      };
   }
}

export default MarketTrendingPoller;
