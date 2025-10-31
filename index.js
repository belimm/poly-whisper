import express from 'express';
import dotenv from 'dotenv';
import TwitterWebSocketService from './src/infrastructure/websocket/twitterWebSocket.js';
import TweetPipeline from './src/services/application/tweetPipeline.js';
import TweetAnalyzer from './src/domain/tweetAnalyzer.js';
import PolymarketService from './src/services/application/polymarketService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store for tweets (in production, you'd use a proper database)
const tweets = [
   {
      tweetId: '1982870059136757864',
      text: "RT @amXFreeze: Grok 4 still ranks #1 on the FinSearchComp Benchmark\n\nIt's a first expert-level benchmark for financial search &amp; reasoning…",
      createdAt: 'Mon Oct 27 18:00:36 +0000 2025',
      authorId: '44196397',
      authorName: 'Elon Musk',
      likeCount: 109,
      retweetCount: 24,
      replyCount: 28,
      receivedAtMs: 1761588038716,
   },
];
const MAX_TWEETS_STORED = 1000; // Limit stored tweets to prevent memory issues

// Initialize services
const twitterWS = new TwitterWebSocketService();
const tweetAnalyzer = new TweetAnalyzer();
const polymarketService = new PolymarketService();

// WebSocket event handlers
twitterWS.on('connected', () => {
   console.log('✅ Twitter WebSocket service connected');
});

twitterWS.on('handshake', () => {
   console.log('✅ Twitter API handshake completed');
});

// Use a processing pipeline to analyze tweets and enrich with Polymarket results
const tweetPipeline = new TweetPipeline(twitterWS);
tweetPipeline.on('enrichedTweet', (enriched) => {
   console.log('📧 ENRICHED TWEET:', enriched);

   // Store enriched tweet (with rotation to prevent memory overflow)
   tweets.unshift(enriched);
   if (tweets.length > MAX_TWEETS_STORED) {
      tweets.pop();
   }
});
tweetPipeline.on('error', (err) => {
   console.error('Tweet pipeline error:', err);
});

twitterWS.on('disconnected', ({ code, reason }) => {
   console.log('❌ Twitter WebSocket disconnected:', code, reason);
});

twitterWS.on('error', (error) => {
   console.error('❌ Twitter WebSocket error:', error);
});

twitterWS.on('maxReconnectAttemptsReached', () => {
   console.error(
      '❌ Max reconnection attempts reached. Manual intervention required.'
   );
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
         'tweets/analyze': '/tweets/analyze',
         'websocket/status': '/websocket/status',
         'websocket/reconnect': '/websocket/reconnect',
      },
   });
});

app.get('/health', (req, res) => {
   const wsStatus = twitterWS.getConnectionStatus();
   res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      websocket: wsStatus,
      tweetsCount: tweets.length,
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
      hasMore: offset + limit < tweets.length,
   });
});

app.get('/tweets/latest', (req, res) => {
   const count = parseInt(req.query.count) || 10;
   const latestTweets = tweets.slice(0, count);

   res.json({
      tweets: latestTweets,
      count: latestTweets.length,
   });
});

app.get('/tweets/analyze', async (req, res) => {
   try {
      const count = parseInt(req.query.count) || 10;
      const useLLM = req.query.llm === 'true'; // Add ?llm=true to use LLM analysis
      const latestTweets = tweets.slice(0, count);

      // Analyze tweets that haven't been processed through the pipeline
      const analyzedTweets = [];
      const marketSummary = {};
      const keywordFrequency = {};
      const categorySummary = {};

      for (const tweet of latestTweets) {
         let analysis;
         let polymarketMatches = [];

         // Check if tweet is already enriched (from pipeline)
         if (tweet.analysis && tweet.polymarketMatches) {
            analysis = tweet.analysis;
            polymarketMatches = tweet.polymarketMatches;
         } else {
            // Analyze raw tweet
            const tweetText =
               tweet.text || tweet.message || JSON.stringify(tweet);

            // Use LLM analysis if requested and available
            if (useLLM) {
               analysis = await tweetAnalyzer.analyzeWithLLM(tweetText);
            } else {
               analysis = tweetAnalyzer.analyzeTweet(tweetText);
            }

            // Search Polymarket for each keyword
            for (const keyword of analysis.keywords || []) {
               try {
                  const data = await polymarketService.search(keyword, {
                     size: 3,
                  });
                  polymarketMatches.push({ keyword, data });
               } catch (err) {
                  console.error(
                     'Polymarket search failed for keyword',
                     keyword,
                     err?.message || err
                  );
               }
            }
         }

         analyzedTweets.push({
            tweet: tweet.original || tweet,
            analysis,
            polymarketMatches,
         });

         // Build summary statistics
         for (const keyword of analysis.keywords || []) {
            keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
         }

         for (const category of analysis.categories || []) {
            categorySummary[category] = (categorySummary[category] || 0) + 1;
         }

         // Count markets found per keyword
         for (const match of polymarketMatches) {
            const marketCount = match.data?.results?.length || 0;
            if (marketCount > 0) {
               marketSummary[match.keyword] =
                  (marketSummary[match.keyword] || 0) + marketCount;
            }
         }
      }

      // Sort summaries by frequency/count
      const topKeywords = Object.entries(keywordFrequency)
         .sort(([, a], [, b]) => b - a)
         .slice(0, 10);

      const topCategories = Object.entries(categorySummary).sort(
         ([, a], [, b]) => b - a
      );

      const topMarkets = Object.entries(marketSummary)
         .sort(([, a], [, b]) => b - a)
         .slice(0, 10);

      res.json({
         summary: {
            tweetsAnalyzed: analyzedTweets.length,
            uniqueKeywords: Object.keys(keywordFrequency).length,
            topKeywords: topKeywords.map(([kw, count]) => ({
               keyword: kw,
               frequency: count,
            })),
            topCategories: topCategories.map(([cat, count]) => ({
               category: cat,
               frequency: count,
            })),
            topMarkets: topMarkets.map(([kw, count]) => ({
               keyword: kw,
               marketsFound: count,
            })),
            analyzedAt: new Date().toISOString(),
         },
         tweets: analyzedTweets,
      });
   } catch (error) {
      console.error('Tweet analysis error:', error);
      res.status(500).json({
         error: 'Failed to analyze tweets',
         message: error.message,
      });
   }
});

app.get('/websocket/status', (req, res) => {
   res.json(twitterWS.getConnectionStatus());
});

app.post('/websocket/reconnect', (req, res) => {
   try {
      console.log('🔄 Manual reconnection requested via API');
      twitterWS.forceReconnect();

      res.json({
         message: 'Force reconnection initiated (attempts reset)',
         timestamp: new Date().toISOString(),
      });
   } catch (error) {
      res.status(500).json({
         error: 'Failed to initiate reconnection',
         message: error.message,
      });
   }
});

// Error handling middleware
app.use((err, req, res, next) => {
   console.error('Express error:', err);
   res.status(500).json({
      error: 'Internal server error',
      message: err.message,
   });
});

// 404 handler
app.use((req, res) => {
   res.status(404).json({
      error: 'Route not found',
      path: req.path,
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
