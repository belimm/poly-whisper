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

// GET /api/tweets - Get tweets with pagination (from database)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
   try {
      const { limit = '50', offset = '0' } = req.query;
      const locals = getAppLocals(req);
      const { tweetDB } = locals;

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      const { tweets, total } = await tweetDB.getLatestTweets(
         limitNum,
         offsetNum
      );

      res.json({
         tweets,
         limit: limitNum,
         offset: offsetNum,
         total,
         hasMore: offsetNum + limitNum < total,
      });
   } catch (error) {
      next(error);
   }
});

// GET /api/tweets/with-analysis - Get tweets with analysis (from database)
router.get(
   '/with-analysis',
   async (req: Request, res: Response, next: NextFunction) => {
      try {
         const { limit = '50', offset = '0' } = req.query;
         const locals = getAppLocals(req);
         const { tweetDB } = locals;

         const limitNum = parseInt(limit as string, 10);
         const offsetNum = parseInt(offset as string, 10);

         const { data: tweets, total } = await tweetDB.getTweetsWithAnalyses(
            limitNum,
            offsetNum
         );

         res.json({
            tweets,
            limit: limitNum,
            offset: offsetNum,
            total,
            hasMore: offsetNum + limitNum < total,
         });
      } catch (error) {
         next(error);
      }
   }
);

// GET /api/tweets/latest - Get latest tweets (from database, fallback to memory)
router.get(
   '/latest',
   async (req: Request, res: Response, next: NextFunction) => {
      try {
         const { limit = '10' } = req.query;
         const locals = getAppLocals(req);
         const { tweetDB } = locals;

         const limitNum = parseInt(limit as string, 10);

         // Try database first, fallback to memory
         try {
            const { tweets } = await tweetDB.getLatestTweets(limitNum, 0);
            return res.json({
               tweets: tweets.map((tweet) => ({
                  ...tweet,
                  markets: tweet.markets || [],
               })),
               count: tweets.length,
               source: 'database',
            });
         } catch (error) {
            // Fallback to in-memory tweets
            const latestTweets = locals.tweets
               .slice(0, limitNum)
               .map((tweet) => ({
                  ...tweet,
                  markets: tweet.markets || [],
               }));

            return res.json({
               tweets: latestTweets,
               count: latestTweets.length,
               source: 'memory',
            });
         }
      } catch (error) {
         next(error);
      }
   }
);

// GET /api/tweets/search - Search tweets (from database)
router.get(
   '/search',
   async (req: Request, res: Response, next: NextFunction) => {
      try {
         const { q } = req.query;
         if (!q || typeof q !== 'string') {
            return res
               .status(400)
               .json({ error: 'Query parameter "q" is required' });
         }

         const locals = getAppLocals(req);
         const { tweetDB } = locals;

         const matchingTweets = await tweetDB.searchTweets(q, 50);

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

// GET /api/tweets/statistics - Get tweet statistics (from database)
router.get(
   '/statistics',
   async (req: Request, res: Response, next: NextFunction) => {
      try {
         const locals = getAppLocals(req);
         const { tweetDB } = locals;

         const dbStats = await tweetDB.getStatistics();

         res.json({
            total: dbStats.totalTweets,
            withAnalysis: dbStats.totalAnalyses,
            timestamp: new Date().toISOString(),
         });
      } catch (error) {
         next(error);
      }
   }
);

export default router;
