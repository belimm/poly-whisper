import express from 'express';
import { authenticateSupabaseUser } from '../middleware/supabaseAuth.js';
import TweetDatabaseService from '../services/database/tweetDatabaseService.js';
import MarketMatchingService from '../services/market/marketMatchingService.js';

const router = express.Router();
const tweetDB = new TweetDatabaseService();
const marketMatcher = new MarketMatchingService();

// All routes in this router require authentication
//router.use(authenticateSupabaseUser);

/**
 * GET /api/tweets/with-analysis
 * Get tweets with their analyses
 * Query params: limit (default: 10), offset (default: 0)
 */
router.get('/with-analysis', async (req, res) => {
   try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;

      const { data, total } = await tweetDB.getTweetsWithAnalyses(
         limit,
         offset
      );

      res.json({
         tweets: data,
         total,
         limit,
         offset,
         hasMore: offset + limit < total,
      });
   } catch (error) {
      console.error('Error fetching tweets with analysis:', error);
      res.status(500).json({
         error: 'Failed to fetch tweets with analysis',
         message: error.message,
      });
   }
});

/**
 * GET /api/tweets/search
 * Search tweets by keyword
 * Query params: q (required), limit (default: 50)
 */
router.get('/search', async (req, res) => {
   try {
      const keyword = req.query.q;

      if (!keyword) {
         return res.status(400).json({
            error: 'Bad request',
            message: 'Query parameter "q" is required',
         });
      }

      const limit = parseInt(req.query.limit) || 50;
      const tweets = await tweetDB.searchTweets(keyword, limit);

      res.json({
         tweets,
         keyword,
         count: tweets.length,
      });
   } catch (error) {
      console.error('Error searching tweets:', error);
      res.status(500).json({
         error: 'Failed to search tweets',
         message: error.message,
      });
   }
});

/**
 * GET /api/tweets/statistics
 * Get tweet statistics
 */
router.get('/statistics', async (req, res) => {
   try {
      const stats = await tweetDB.getStatistics();

      res.json({
         statistics: stats,
         timestamp: new Date().toISOString(),
      });
   } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
         error: 'Failed to fetch statistics',
         message: error.message,
      });
   }
});

/**
 * GET /api/tweets/:tweetId/findMarkets
 * Find related Polymarket markets for a tweet based on its analysis keywords
 * Returns markets matching the tweet's betting keywords
 */
router.get('/:tweetId/findMarkets', async (req, res) => {
   try {
      const { tweetId } = req.params;

      console.log(`🔍 Finding markets for tweet: ${tweetId}`);

      // Fetch tweet with its analysis
      const tweet = await tweetDB.getTweetWithAnalysisById(tweetId);

      // Extract betting keywords from analysis (not categories)
      const keywords = tweet.analysis?.keywords || [];

      console.log(`📊 Tweet keywords:`, keywords);

      if (!keywords || keywords.length === 0) {
         return res.json({
            success: true,
            tweetId: tweet.id,
            keywords: [],
            markets: [],
            message: 'No keywords found in tweet analysis',
         });
      }

      // Search Polymarket for markets using betting keywords
      const marketsByKeyword = await marketMatcher.findMarketsByKeywords(
         keywords
      );

      // Flatten all markets from all keywords
      const allMarkets = [];
      const seenIds = new Set();

      Object.values(marketsByKeyword).forEach((markets) => {
         if (Array.isArray(markets)) {
            markets.forEach((market) => {
               if (!seenIds.has(market.id)) {
                  seenIds.add(market.id);
                  allMarkets.push(market);
               }
            });
         }
      });

      console.log(
         `✅ Found ${allMarkets.length} markets for keywords:`,
         keywords
      );

      res.json({
         success: true,
         tweetId: tweet.id,
         keywords,
         markets: allMarkets,
         marketCount: allMarkets.length,
         marketsByKeyword,
      });
   } catch (error) {
      console.error('❌ Error finding markets:', error);

      if (error.message === 'Tweet not found') {
         return res.status(404).json({
            success: false,
            error: 'Tweet not found',
            message: 'Tweet with given ID not found',
         });
      }

      res.status(500).json({
         success: false,
         error: 'Failed to find markets',
         message: error.message,
      });
   }
});

/**
 * GET /api/tweets/:tweetId
 * Get a specific tweet by database ID
 */
router.get('/:tweetId', async (req, res) => {
   try {
      const { tweetId } = req.params;

      // Fetch tweet with its analysis
      const tweet = await tweetDB.getTweetWithAnalysisById(tweetId);

      res.json({
         success: true,
         tweet: {
            id: tweet.id,
            details: tweet.tweetDetails,
            analysis: tweet.analysis,
            enrichedAt: tweet.enrichedAt,
         },
      });
   } catch (error) {
      console.error('Error fetching tweet:', error);

      if (error.message === 'Tweet not found') {
         return res.status(404).json({
            success: false,
            error: 'Tweet not found',
         });
      }

      res.status(500).json({
         success: false,
         error: 'Failed to fetch tweet',
         message: error.message,
      });
   }
});

export default router;
