import express from 'express';
import { authenticateSupabaseUser } from '../middleware/supabaseAuth.js';
import TweetDatabaseService from '../services/database/tweetDatabaseService.js';

const router = express.Router();
const tweetDB = new TweetDatabaseService();

// All routes in this router require authentication
router.use(authenticateSupabaseUser);

/**
 * GET /api/tweets
 * Get tweets with pagination
 * Query params: limit (default: 10), offset (default: 0)
 */

/*/api/v2/tweets?limit=10 */
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const { tweets, total } = await tweetDB.getLatestTweets(limit, offset);

        res.json({
            tweets,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
            user: {
                id: req.user.id,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Error fetching tweets:', error);
        res.status(500).json({
            error: 'Failed to fetch tweets',
            message: error.message
        });
    }
});

/**
 * GET /api/tweets/latest
 * Get latest tweets (shorthand)
 * Query params: count (default: 10)
 */

router.get('/latest', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 10;
        const { tweets } = await tweetDB.getLatestTweets(count, 0);

        res.json({
            tweets,
            count: tweets.length,
            user: {
                id: req.user.id,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Error fetching latest tweets:', error);
        res.status(500).json({
            error: 'Failed to fetch latest tweets',
            message: error.message
        });
    }
});

/**
 * GET /api/tweets/with-analysis
 * Get tweets with their analyses
 * Query params: limit (default: 10), offset (default: 0)
 */
router.get('/with-analysis', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const { data, total } = await tweetDB.getTweetsWithAnalyses(limit, offset);

        res.json({
            tweets: data,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
            user: {
                id: req.user.id,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Error fetching tweets with analysis:', error);
        res.status(500).json({
            error: 'Failed to fetch tweets with analysis',
            message: error.message
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
                message: 'Query parameter "q" is required'
            });
        }

        const limit = parseInt(req.query.limit) || 50;
        const tweets = await tweetDB.searchTweets(keyword, limit);

        res.json({
            tweets,
            keyword,
            count: tweets.length,
            user: {
                id: req.user.id,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Error searching tweets:', error);
        res.status(500).json({
            error: 'Failed to search tweets',
            message: error.message
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
            user: {
                id: req.user.id,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: error.message
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

        // This would require adding a method to TweetDatabaseService
        // For now, we'll return a not implemented response
        res.status(501).json({
            error: 'Not implemented',
            message: 'Single tweet retrieval not yet implemented'
        });
    } catch (error) {
        console.error('Error fetching tweet:', error);
        res.status(500).json({
            error: 'Failed to fetch tweet',
            message: error.message
        });
    }
});

export default router;
