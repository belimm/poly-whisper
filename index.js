import { createServer } from 'http';
import dotenv from 'dotenv';
import app, { setupCors } from './app.js';
import TwitterWebSocketService from './src/infrastructure/websocket/twitterWebSocket.js';
import ClientWebSocketService from './src/infrastructure/websocket/clientWebSocket.js';
import TweetPipeline from './src/services/application/tweetPipeline.js';
import TweetAnalyzer from './src/domain/tweetAnalyzer.js';
import PolymarketService from './src/services/application/polymarketService.js';
import { SimpleTokenAuth } from './src/middleware/simpleAuth.js';
import TweetDatabaseService from './src/services/database/tweetDatabaseService.js';
import tweetRoutes from './src/routes/tweetRoutes.js';
import userRoutes from './src/routes/userRoutes.js';

// Load environment variables
dotenv.config();

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
   console.log('✅ Twitter WebSocket service connected');
   clientWS.broadcastSystemMessage(
      'Twitter WebSocket connected - listening for tweets',
      'info'
   );
});

twitterWS.on('handshake', () => {
   console.log('✅ Twitter API handshake completed');
   clientWS.broadcastSystemMessage('Twitter API handshake completed', 'info');
});

// Use a processing pipeline to analyze tweets and enrich with Polymarket results
const tweetPipeline = new TweetPipeline(twitterWS);
tweetPipeline.on('enrichedTweet', async (enriched) => {
   console.log('📧 ENRICHED TWEET:', enriched);

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

         console.log('✅ Tweet saved to database:', dbTweet.id);
      } catch (dbError) {
         console.error('❌ Failed to save tweet to database:', dbError.message);
      }
   }

   // Broadcast to frontend clients
   clientWS.broadcastTweet(enriched);
});
tweetPipeline.on('error', (err) => {
   console.error('Tweet pipeline error:', err);
   clientWS.broadcastSystemMessage(
      `Tweet pipeline error: ${err.message}`,
      'error'
   );
});

twitterWS.on('disconnected', ({ code, reason }) => {
   console.log('❌ Twitter WebSocket disconnected:', code, reason);
   clientWS.broadcastSystemMessage(
      `Twitter WebSocket disconnected: ${reason}`,
      'warning'
   );
});

twitterWS.on('error', (error) => {
   console.error('❌ Twitter WebSocket error:', error);
   clientWS.broadcastSystemMessage(
      `Twitter WebSocket error: ${error.message}`,
      'error'
   );
});

twitterWS.on('maxReconnectAttemptsReached', () => {
   console.error(
      '❌ Max reconnection attempts reached. Manual intervention required.'
   );
   clientWS.broadcastSystemMessage(
      'Twitter WebSocket max reconnection attempts reached - manual intervention required',
      'error'
   );
});

// Start the server
server.listen(PORT, () => {
   console.log(`🚀 PolySense Backend server running on port ${PORT}`);
   console.log(`📊 Health check: http://localhost:${PORT}/health`);
   console.log(`🔐 Authentication: Simple token-based`);
   console.log(`🐦 Tweet endpoints: http://localhost:${PORT}/api/tweets/`);
   console.log(
      `🔌 WebSocket endpoint: ws://localhost:${PORT}/ws?token=<api_token>`
   );
   console.log(`\n🌐 Frontend should run on: http://localhost:8000`);
   console.log(`📡 Frontend WebSocket connection: ws://localhost:${PORT}/ws`);

   // Generate and display a frontend token
   const frontendToken = SimpleTokenAuth.generateApiToken('polysense-frontend');
   console.log('\n🎫 Frontend Token (save this for your frontend):');
   console.log('   Token:', frontendToken);
   console.log('\n📋 Frontend Usage:');
   console.log('   HTTP Header: x-api-key:', frontendToken);
   console.log('   OR Authorization: Bearer', frontendToken);
   console.log(
      '   WebSocket: ws://localhost:' + PORT + '/ws?token=' + frontendToken
   );
   console.log('\n💾 Store this token in your frontend .env file as:');
   console.log('   VITE_API_TOKEN=' + frontendToken);
   console.log('   VITE_API_URL=http://localhost:' + PORT);
   console.log('   VITE_WS_URL=ws://localhost:' + PORT);
   console.log('   # or for React:');
   console.log('   # REACT_APP_API_TOKEN=' + frontendToken);
   console.log('   # REACT_APP_API_URL=http://localhost:' + PORT);
   console.log('   # REACT_APP_WS_URL=ws://localhost:' + PORT);

   // Connect to Twitter WebSocket
   twitterWS.connect();
});

// Graceful shutdown
process.on('SIGTERM', () => {
   console.log('🛑 SIGTERM received, shutting down gracefully');
   clientWS.close();
   twitterWS.disconnect();
   server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
   });
});

process.on('SIGINT', () => {
   console.log('🛑 SIGINT received, shutting down gracefully');
   clientWS.close();
   twitterWS.disconnect();
   server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
   });
});
