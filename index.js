import express from 'express';
import dotenv from 'dotenv';
import TwitterWebSocketService from './src/services/twitterWebSocket.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store for tweets (in production, you'd use a proper database)
const tweets = [];
const MAX_TWEETS_STORED = 1000; // Limit stored tweets to prevent memory issues

// Initialize Twitter WebSocket Service
const twitterWS = new TwitterWebSocketService();

// WebSocket event handlers
twitterWS.on('connected', () => {
   console.log('✅ Twitter WebSocket service connected');
});

twitterWS.on('handshake', () => {
   console.log('✅ Twitter API handshake completed');
});

twitterWS.on('tweet', (tweet) => {
   console.log('📧 NEW TWEET:', tweet);
   
   // Store tweet (with rotation to prevent memory overflow)
   tweets.unshift(tweet);
   if (tweets.length > MAX_TWEETS_STORED) {
      tweets.pop();
   }
});

twitterWS.on('disconnected', ({ code, reason }) => {
   console.log('❌ Twitter WebSocket disconnected:', code, reason);
});

twitterWS.on('error', (error) => {
   console.error('❌ Twitter WebSocket error:', error);
});

twitterWS.on('maxReconnectAttemptsReached', () => {
   console.error('❌ Max reconnection attempts reached. Manual intervention required.');
});

// API Routes
app.get('/', (req, res) => {
   res.json({
      message: 'PolySense Backend API',
      status: 'running',
      websocket: twitterWS.getConnectionStatus(),
      endpoints: {
         health: '/health',
         tweets: '/tweets',
         'tweets/latest': '/tweets/latest',
         'websocket/status': '/websocket/status',
         'websocket/reconnect': '/websocket/reconnect'
      }
   });
});

app.get('/health', (req, res) => {
   const wsStatus = twitterWS.getConnectionStatus();
   res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      websocket: wsStatus,
      tweetsCount: tweets.length
   });
});

app.get('/tweets', (req, res) => {
   const limit = parseInt(req.query.limit) || 50;
   const offset = parseInt(req.query.offset) || 0;
   
   const paginatedTweets = tweets.slice(offset, offset + limit);
   
   res.json({
      tweets: paginatedTweets,
      total: tweets.length,
      limit,
      offset,
      hasMore: offset + limit < tweets.length
   });
});

app.get('/tweets/latest', (req, res) => {
   const count = parseInt(req.query.count) || 10;
   const latestTweets = tweets.slice(0, count);
   
   res.json({
      tweets: latestTweets,
      count: latestTweets.length
   });
});

app.get('/websocket/status', (req, res) => {
   res.json(twitterWS.getConnectionStatus());
});

app.post('/websocket/reconnect', (req, res) => {
   try {
      twitterWS.disconnect();
      setTimeout(() => {
         twitterWS.connect();
      }, 1000);
      
      res.json({
         message: 'Reconnection initiated',
         timestamp: new Date().toISOString()
      });
   } catch (error) {
      res.status(500).json({
         error: 'Failed to initiate reconnection',
         message: error.message
      });
   }
});

// Error handling middleware
app.use((err, req, res, next) => {
   console.error('Express error:', err);
   res.status(500).json({
      error: 'Internal server error',
      message: err.message
   });
});

// 404 handler
app.use((req, res) => {
   res.status(404).json({
      error: 'Route not found',
      path: req.path
   });
});

// Start the server
app.listen(PORT, () => {
   console.log(`🚀 PolySense Backend server running on port ${PORT}`);
   console.log(`📊 Health check: http://localhost:${PORT}/health`);
   console.log(`🐦 Latest tweets: http://localhost:${PORT}/tweets/latest`);
   
   // Connect to Twitter WebSocket
   twitterWS.connect();
});

// Graceful shutdown
process.on('SIGTERM', () => {
   console.log('🛑 SIGTERM received, shutting down gracefully');
   twitterWS.disconnect();
   process.exit(0);
});

process.on('SIGINT', () => {
   console.log('🛑 SIGINT received, shutting down gracefully');
   twitterWS.disconnect();
   process.exit(0);
});
