/**
 * Poly-Whisper Backend - Main Entry Point
 * TypeScript implementation with strict typing
 */

import { createServer, type Server } from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { TwitterWebSocketService } from './infrastructure/websocket/twitterWebSocket.js';
import { ClientWebSocketService } from './infrastructure/websocket/clientWebSocket.js';
import { buildRestUrl, buildWebSocketUrl, isDev } from './utils/urlBuilder.js';
import { devLog, errorLog, infoLog } from './utils/logger.js';
import type { EnrichedTweet, AppLocals, TweetDetails } from './types/index.js';

// Import services (TypeScript)
import MarketCatalogService from './services/market/marketCatalogService.js';
import IntelligentMarketMatcher from './services/market/intelligentMarketMatcher.js';
import MarketMatchingService from './services/market/marketMatchingService.js';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

// Create HTTP server
const server: Server = createServer(app);

// Initialize data storage and services
const tweets: EnrichedTweet[] = [];
const MAX_TWEETS_STORED = 1000;

const twitterWS = new TwitterWebSocketService();
const clientWS = new ClientWebSocketService();

// TODO: Convert these to TypeScript
// const tweetAnalyzer = new TweetAnalyzer();
// const tweetDB = new TweetDatabaseService();
// const tweetQueue = new TweetProcessingQueue({...});

// ============================================================================
// Market Catalog Service (Updated)
// ============================================================================
const marketCatalogService = new MarketCatalogService({
   refreshInterval: parseInt(
      process.env.MARKET_CATALOG_REFRESH_INTERVAL || '600000',
      10
   ), // 10 min default
   minVolume: parseInt(process.env.MARKET_CATALOG_MIN_VOLUME || '10000', 10), // $10k default
   minLiquidity: parseInt(
      process.env.MARKET_CATALOG_MIN_LIQUIDITY || '500',
      10
   ),
   log: console,
});

// ============================================================================
// Intelligent Market Matcher (LLM-based)
// ============================================================================
const intelligentMatcher = new IntelligentMarketMatcher({
   catalogService: marketCatalogService,
   maxMatches: parseInt(process.env.MAX_MARKETS_PER_TWEET || '5', 10),
   minRelevanceScore: parseFloat(process.env.MIN_RELEVANCE_SCORE || '0.5'),
   log: console,
});

// ============================================================================
// Market Matching Service (Updated to use intelligent matcher)
// ============================================================================
const marketMatcher = new MarketMatchingService({
   intelligentMatcher: intelligentMatcher,
   useIntelligentMode: true, // Enable intelligent matching by default
   maxMarketsPerKeyword: parseInt(
      process.env.MAX_MARKETS_PER_KEYWORD || '5',
      10
   ),
   log: console,
});

// Inject services and data into app locals for use in routes
// Note: We'll need to add proper types for all services
const appLocals: AppLocals = {
   tweets,
   twitterWS,
   clientWS,
   tweetAnalyzer: {} as any, // TODO: Replace with actual TweetAnalyzer
   tweetDB: {} as any, // TODO: Replace with actual TweetDatabaseService
   tweetQueue: {} as any, // TODO: Replace with actual TweetProcessingQueue
   marketMatcher,
   marketCatalogService,
   intelligentMatcher,
};

// Assign to app.locals
Object.assign(app.locals, appLocals);

// Market routes are registered in app.ts

// Create WebSocket server for frontend clients
clientWS.createServer(server);

// WebSocket event handlers
twitterWS.on('connected', () => {
   devLog('✅ Twitter WebSocket service connected');
   clientWS.broadcastSystemMessage(
      'Twitter WebSocket connected - listening for tweets',
      'info'
   );
});

twitterWS.on('handshake', () => {
   devLog('✅ Twitter API handshake completed');
   clientWS.broadcastSystemMessage('Twitter API handshake completed', 'info');
});

// TODO: Set up tweet pipeline when services are converted
// const tweetPipeline = new TweetPipeline(twitterWS);
// tweetPipeline.on('enrichedTweet', (enriched) => {
//   // Handle enriched tweets
// });

// Temporary tweet handler until pipeline is set up
twitterWS.on('tweet', async (tweet: TweetDetails) => {
   try {
      // Skip replies and retweets
      if (tweet.isReply || tweet.isRetweet) {
         return;
      }

      devLog('📧 TWEET received:', tweet.tweetId);

      // TODO: Analyze tweet and match markets
      // For now, create a basic enriched tweet
      const enriched: EnrichedTweet = {
         tweetDetails: tweet,
         analysis: {
            sentiment: 'neutral',
            sentiment_score: 0.5,
            keywords: [],
            categories: [],
         },
         enrichedAt: new Date().toISOString(),
      };

      // Store in memory
      tweets.unshift(enriched);
      if (tweets.length > MAX_TWEETS_STORED) {
         tweets.pop();
      }

      // Broadcast to frontend clients
      clientWS.broadcastTweet(enriched);

      // TODO: Add to processing queue for database persistence
   } catch (error) {
      errorLog('Error processing tweet:', error);
   }
});

twitterWS.on(
   'disconnected',
   ({ code, reason }: { code: number; reason: string }) => {
      devLog('❌ Twitter WebSocket disconnected:', code, reason);
      clientWS.broadcastSystemMessage(
         `Twitter WebSocket disconnected: ${reason}`,
         'warning'
      );
   }
);

twitterWS.on('error', (error: Error) => {
   errorLog('❌ Twitter WebSocket error:', error);
   clientWS.broadcastSystemMessage(
      `Twitter WebSocket error: ${error.message}`,
      'error'
   );
});

twitterWS.on('maxReconnectAttemptsReached', () => {
   errorLog(
      '❌ Max reconnection attempts reached. Manual intervention required.'
   );
   clientWS.broadcastSystemMessage(
      'Twitter WebSocket max reconnection attempts reached - manual intervention required',
      'error'
   );
});

// Start the server
server.listen(PORT, async () => {
   const healthCheckUrl = buildRestUrl('/health', PORT);
   const tweetEndpointUrl = buildRestUrl('/api/tweets/', PORT);
   const wsEndpointUrl = buildWebSocketUrl('/ws', PORT);

   if (isDev()) {
      console.log(
         `🚀 Poly-Whisper Backend (TypeScript) server running on port ${PORT}`
      );
      console.log(`📊 Health check: ${healthCheckUrl}`);
      console.log(`🔐 Authentication: Supabase-based`);
      console.log(`🐦 Tweet endpoints: ${tweetEndpointUrl}`);
      console.log(`🔌 WebSocket endpoint: ${wsEndpointUrl}`);
      console.log(`\n🌐 Frontend should run on: http://localhost:3001`);
      console.log(`📡 Frontend WebSocket connection: ${wsEndpointUrl}`);
   } else {
      console.log(`🚀 Server running in PRODUCTION mode`);
      console.log(`📊 Domain: ${process.env.PROD_DOMAIN}`);
   }

   // ============================================================================
   // Start Market Catalog Service
   // ============================================================================
   try {
      await marketCatalogService.start();
      infoLog('✅ Market Catalog Service started');

      // Log initial stats
      const stats = marketCatalogService.getStats();
      infoLog(
         `📊 Market Catalog Stats: ${stats.totalMarkets} markets, refresh every ${stats.refreshIntervalMinutes} minutes`
      );
   } catch (error) {
      errorLog(
         '❌ Failed to start Market Catalog Service:',
         (error as Error).message
      );
      errorLog('⚠️  Intelligent market matching will not be available');
   }

   // Connect to Twitter WebSocket
   twitterWS.connect();
});

// Graceful shutdown
const shutdown = async (signal: string) => {
   infoLog(`🛑 ${signal} received, shutting down gracefully`);
   infoLog('⏳ Stopping services...');

   try {
      // Stop market catalog service
      marketCatalogService.stop();
      infoLog('✅ Market catalog service stopped');

      // Stop accepting new tweets
      twitterWS.disconnect();
      clientWS.close();
      infoLog('✅ WebSocket services closed');

      // TODO: Wait for queue to finish processing pending tweets
      // await tweetQueue.drain();
      // infoLog('✅ Tweet processing queue drained');
   } catch (error) {
      errorLog('❌ Error during shutdown:', (error as Error).message);
   }

   server.close(() => {
      infoLog('✅ Server closed');
      process.exit(0);
   });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
