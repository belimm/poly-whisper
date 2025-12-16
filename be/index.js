import { createServer } from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import TwitterWebSocketService from './src/infrastructure/websocket/twitterWebSocket.js';
import ClientWebSocketService from './src/infrastructure/websocket/clientWebSocket.js';
import TweetPipeline from './src/services/application/tweetPipeline.js';
import TweetAnalyzer from './src/domain/tweetAnalyzer.js';
import PolymarketService from './src/services/application/polymarketService.js';
import TweetDatabaseService from './src/services/database/tweetDatabaseService.js';
import TweetProcessingQueue from './src/services/application/tweetProcessingQueue.js';
import PolymarketPoller from './src/services/market/polymarketPoller.js';
import MarketMatchingService from './src/services/market/marketMatchingService.js';
import MarketCacheService from './src/services/market/marketCacheService.js';
import tweetRoutes from './src/routes/tweetRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import { devLog, errorLog, infoLog } from './src/utils/logger.js';

// Load environment variables
dotenv.config();

import {
   buildRestUrl,
   buildWebSocketUrl,
   isDev,
} from './src/utils/urlBuilder.js';





const PORT = parseInt(process.env.PORT || '3000', 10);

// Create HTTP server
const server = createServer(app);

// Initialize data storage and services
const tweets = [];
const MAX_TWEETS_STORED = 1000;

const twitterWS = new TwitterWebSocketService();
const clientWS = new ClientWebSocketService();
const tweetAnalyzer = new TweetAnalyzer();
const polymarketService = new PolymarketService();
const tweetDB = new TweetDatabaseService();

// Initialize tweet processing queue with concurrency control
const tweetQueue = new TweetProcessingQueue({
   tweetDB,
   clientWS,
   concurrency: 2, // Max 2 tweets processed simultaneously
   maxQueueSize: 100, // Max 100 tweets in queue before rejecting
});

// Initialize market update services
const marketCache = new MarketCacheService(
   parseInt(process.env.MARKET_CACHE_TTL || '300000', 10) // 5 min default
);

const marketMatcher = new MarketMatchingService({
   polymarket: polymarketService,
   cache: marketCache,
   maxMarketsPerKeyword: parseInt(process.env.MAX_MARKETS_PER_KEYWORD || '5', 10)
});

const polymarketPoller = new PolymarketPoller({
   tweetDB,
   marketMatcher,
   clientWS,
   tweetsArray: tweets, // Pass in-memory tweets array for real-time data
   pollingInterval: parseInt(process.env.POLLING_INTERVAL || '3000', 10), // 3 sec default
   tweetsLimit: parseInt(process.env.POLLS_TWEETS_LIMIT || '10', 10),
   retryAttempts: parseInt(process.env.POLLING_RETRY_ATTEMPTS || '3', 10),
   retryDelay: parseInt(process.env.POLLING_RETRY_DELAY || '1000', 10)
});

// Inject services and data into app locals for use in routes
app.locals.tweets = tweets;
app.locals.twitterWS = twitterWS;
app.locals.clientWS = clientWS;
app.locals.tweetAnalyzer = tweetAnalyzer;
app.locals.polymarketService = polymarketService;
app.locals.tweetDB = tweetDB;
app.locals.tweetQueue = tweetQueue;
app.locals.polymarketPoller = polymarketPoller;
app.locals.marketMatcher = marketMatcher;
app.locals.marketCache = marketCache;

// Register new routes with Supabase authentication
app.use('/api/tweets', tweetRoutes);
app.use('/api/user', userRoutes);

// // Queue monitoring endpoints (public for monitoring)
// app.get('/api/queue-stats', (req, res) => {
//    res.json({
//       queue: tweetQueue.getStats(),
//       timestamp: new Date().toISOString(),
//    });
// });

// // Endpoint to adjust queue concurrency on the fly
// app.post('/api/queue-concurrency', (req, res) => {
//    const { concurrency } = req.body;

//    if (!concurrency || concurrency < 1 || concurrency > 10) {
//       return res.status(400).json({
//          error: 'Invalid concurrency value',
//          message: 'Concurrency must be between 1 and 10',
//       });
//    }

//    tweetQueue.setConcurrency(concurrency);
//    res.json({
//       message: `Queue concurrency updated to ${concurrency}`,
//       stats: tweetQueue.getStats(),
//    });
// });

// Create WebSocket server for frontend clients
clientWS.createServer(server);

// WebSocket event handlers
twitterWS.on('connected', () => {
   devLog('✅ Twitter WebSocket service connected');
   clientWS.broadcastSystemMessage(
      'Twitter WebSocket connected - listening for tweets',
      'info'
   );

   // Start market polling once Twitter WebSocket is connected
   polymarketPoller.start().catch(err => {
      errorLog('Failed to start Polymarket poller:', err.message);
   });
});

twitterWS.on('handshake', () => {
   devLog('✅ Twitter API handshake completed');
   clientWS.broadcastSystemMessage('Twitter API handshake completed', 'info');
});

// Use a processing pipeline to analyze tweets and enrich with Polymarket results
const tweetPipeline = new TweetPipeline(twitterWS);
tweetPipeline.on('enrichedTweet', (enriched) => {
   devLog('📧 ENRICHED TWEET received:', enriched.tweetDetails?.tweetId);

   // Store enriched tweet in memory (with rotation to prevent memory overflow)
   tweets.unshift(enriched);
   if (tweets.length > MAX_TWEETS_STORED) {
      tweets.pop();
   }

   // Broadcast to frontend clients immediately (don't wait for database)
   clientWS.broadcastTweet(enriched);

   // Add to processing queue for database persistence
   // The queue ensures controlled concurrency to avoid API rate limits and DB connection pool issues
   const queued = tweetQueue.addTweet(enriched);

   if (!queued) {
      errorLog(
         `⚠️ Tweet ${enriched.tweetDetails?.tweetId} could not be queued - queue is full`
      );
   }
});
tweetPipeline.on('error', (err) => {
   errorLog('Tweet pipeline error:', err);
   clientWS.broadcastSystemMessage(
      `Tweet pipeline error: ${err.message}`,
      'error'
   );
});

twitterWS.on('disconnected', ({ code, reason }) => {
   devLog('❌ Twitter WebSocket disconnected:', code, reason);
   clientWS.broadcastSystemMessage(
      `Twitter WebSocket disconnected: ${reason}`,
      'warning'
   );
});

twitterWS.on('error', (error) => {
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
server.listen(PORT, () => {
   const healthCheckUrl = buildRestUrl('/health', PORT);
   const tweetEndpointUrl = buildRestUrl('/api/tweets/', PORT);
   const wsEndpointUrl = buildWebSocketUrl('/ws', PORT);

   if (isDev()) {
      console.log(`🚀 PolySense Backend server running on port ${PORT}`);
      console.log(`📊 Health check: ${healthCheckUrl}`);
      console.log(`🔐 Authentication: Simple token-based`);
      console.log(`🐦 Tweet endpoints: ${tweetEndpointUrl}`);
      console.log(`🔌 WebSocket endpoint: ${wsEndpointUrl}?token=<api_token>`);
      console.log(`\n🌐 Frontend should run on: http://localhost:3001`);
      console.log(`📡 Frontend WebSocket connection: ${wsEndpointUrl}`);
   } else {
      console.log(`🚀 Server running in PRODUCTION mode`);
      console.log(`📊 Domain: ${process.env.PROD_DOMAIN}`);
   }

   // Connect to Twitter WebSocket
   twitterWS.connect();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
   infoLog('🛑 SIGTERM received, shutting down gracefully');
   infoLog('⏳ Stopping services...');

   try {
      // Stop market polling
      polymarketPoller.stop();
      infoLog('✅ Market poller stopped');

      // Stop accepting new tweets
      twitterWS.disconnect();
      clientWS.close();
      infoLog('✅ WebSocket services closed');

      // Wait for queue to finish processing pending tweets
      await tweetQueue.drain();
      infoLog('✅ Tweet processing queue drained');
   } catch (error) {
      errorLog('❌ Error during shutdown:', error.message);
   }

   server.close(() => {
      infoLog('✅ Server closed');
      process.exit(0);
   });
});

process.on('SIGINT', async () => {
   infoLog('🛑 SIGINT received, shutting down gracefully');
   infoLog('⏳ Stopping services...');

   try {
      // Stop market polling
      polymarketPoller.stop();
      infoLog('✅ Market poller stopped');

      // Stop accepting new tweets
      twitterWS.disconnect();
      clientWS.close();
      infoLog('✅ WebSocket services closed');

      // Wait for queue to finish processing pending tweets
      await tweetQueue.drain();
      infoLog('✅ Tweet processing queue drained');
   } catch (error) {
      errorLog('❌ Error during shutdown:', error.message);
   }

   server.close(() => {
      infoLog('✅ Server closed');
      process.exit(0);
   });
});
