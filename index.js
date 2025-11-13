import { createServer } from 'http';
import dotenv from 'dotenv';
import app, { setupCors } from './app.js';
import TwitterWebSocketService from './src/infrastructure/websocket/twitterWebSocket.js';
import ClientWebSocketService from './src/infrastructure/websocket/clientWebSocket.js';
import TweetPipeline from './src/services/application/tweetPipeline.js';
import TweetAnalyzer from './src/domain/tweetAnalyzer.js';
import PolymarketService from './src/services/application/polymarketService.js';
import TweetDatabaseService from './src/services/database/tweetDatabaseService.js';
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



// Setup CORS after environment is loaded
setupCors();

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

// Inject services and data into app locals for use in routes
app.locals.tweets = tweets;
app.locals.twitterWS = twitterWS;
app.locals.clientWS = clientWS;
app.locals.tweetAnalyzer = tweetAnalyzer;
app.locals.polymarketService = polymarketService;
app.locals.tweetDB = tweetDB;

// Register new routes with Supabase authentication
app.use('/api/v2/tweets', tweetRoutes);
app.use('/api/v2/user', userRoutes);

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

// Use a processing pipeline to analyze tweets and enrich with Polymarket results
const tweetPipeline = new TweetPipeline(twitterWS);
tweetPipeline.on('enrichedTweet', async (enriched) => {
   devLog('📧 ENRICHED TWEET:', enriched);

   // Store enriched tweet (with rotation to prevent memory overflow)
   tweets.unshift(enriched);
   if (tweets.length > MAX_TWEETS_STORED) {
      tweets.pop();
   }

   // Save to database if Supabase is configured
   if (tweetDB) {
      try {
         // Insert enriched tweet (with tweetDetails, analysis, polymarketMatches)
         const dbTweet = await tweetDB.insertTweet(enriched);

         // Insert analysis if available
         if (enriched.analysis && dbTweet) {
            await tweetDB.insertAnalysis(dbTweet.id, enriched.analysis);
         }

         // Insert Polymarket matches if available
         if (enriched.polymarketMatches && enriched.polymarketMatches.length > 0 && dbTweet) {
            await tweetDB.insertPolymarketMatches(dbTweet.id, enriched.polymarketMatches);
         }

         devLog('✅ Tweet saved to database:', dbTweet.id);
      } catch (dbError) {
         errorLog('❌ Failed to save tweet to database:', dbError.message);
      }
   }

   // Broadcast to frontend clients
   clientWS.broadcastTweet(enriched);
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
      console.log(`\n🌐 Frontend should run on: http://localhost:5173`);
      console.log(`📡 Frontend WebSocket connection: ${wsEndpointUrl}`);
   } else {
      console.log(`🚀 Server running in PRODUCTION mode`);
      console.log(`📊 Domain: ${process.env.PROD_DOMAIN}`);
   }

   // Connect to Twitter WebSocket
   twitterWS.connect();
});

// Graceful shutdown
process.on('SIGTERM', () => {
   infoLog('🛑 SIGTERM received, shutting down gracefully');
   clientWS.close();
   twitterWS.disconnect();
   server.close(() => {
      infoLog('✅ Server closed');
      process.exit(0);
   });
});

process.on('SIGINT', () => {
   infoLog('🛑 SIGINT received, shutting down gracefully');
   clientWS.close();
   twitterWS.disconnect();
   server.close(() => {
      infoLog('✅ Server closed');
      process.exit(0);
   });
});
