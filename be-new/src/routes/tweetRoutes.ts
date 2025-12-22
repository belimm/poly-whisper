/**
 * Tweet routes
 * Handles tweet-related API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { AppLocals } from '../types/index.js';

const router = Router();

// Middleware to get app locals
const getAppLocals = (req: Request): AppLocals => {
  return req.app.locals;
};

// GET /api/tweets - Get tweets with pagination
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const locals = getAppLocals(req);
    const { tweetDB } = locals;

    // TODO: Implement tweet fetching from database
    res.json({
      tweets: [],
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      total: 0,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tweets/with-analysis - Get tweets with analysis
router.get(
  '/with-analysis',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '50', offset = '0' } = req.query;
      const locals = getAppLocals(req);

      // Get in-memory tweets (for real-time)
      const tweets = locals.tweets.slice(
        parseInt(offset as string, 10),
        parseInt(offset as string, 10) + parseInt(limit as string, 10)
      );

      res.json({
        tweets,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        total: locals.tweets.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tweets/latest - Get latest tweets
router.get(
  '/latest',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '10' } = req.query;
      const locals = getAppLocals(req);

      const latestTweets = locals.tweets
        .slice(0, parseInt(limit as string, 10))
        .map((tweet) => ({
          ...tweet,
          markets: tweet.markets || [],
        }));

      res.json({
        tweets: latestTweets,
        count: latestTweets.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tweets/search - Search tweets
router.get(
  '/search',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      const locals = getAppLocals(req);
      const query = q.toLowerCase();

      const matchingTweets = locals.tweets.filter(
        (tweet) =>
          tweet.tweetDetails.text.toLowerCase().includes(query) ||
          tweet.analysis.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query)
          )
      );

      res.json({
        tweets: matchingTweets,
        query: q,
        count: matchingTweets.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tweets/statistics - Get tweet statistics
router.get(
  '/statistics',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locals = getAppLocals(req);
      const tweets = locals.tweets;

      const stats = {
        total: tweets.length,
        withAnalysis: tweets.filter((t) => t.analysis).length,
        sentiment: {
          positive: tweets.filter((t) => t.analysis.sentiment === 'positive')
            .length,
          negative: tweets.filter((t) => t.analysis.sentiment === 'negative')
            .length,
          neutral: tweets.filter((t) => t.analysis.sentiment === 'neutral')
            .length,
        },
        withMarkets: tweets.filter((t) => t.markets && t.markets.length > 0)
          .length,
        categories: {} as Record<string, number>,
      };

      // Count categories
      tweets.forEach((tweet) => {
        tweet.analysis.categories.forEach((category) => {
          stats.categories[category] = (stats.categories[category] || 0) + 1;
        });
      });

      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

