/**
 * Analysis refresh routes
 * Handles on-demand analysis refresh for tweets
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { AppLocals } from '../types/index.js';
import AnalysisRefreshService from '../services/analysis/analysisRefreshService';

const router = Router();

// Middleware to get app locals
const getAppLocals = (req: Request): AppLocals => {
  return req.app.locals;
};

// POST /api/analysis/refresh/:tweetId - Refresh analysis for a single tweet
router.post(
  '/refresh/:tweetId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tweetId } = req.params;
      const locals = getAppLocals(req);
      const { tweetDB, marketMatcher, tweetAnalyzer } = locals;

      const refreshService = new AnalysisRefreshService({
        tweetDB,
        marketMatcher,
        tweetAnalyzer,
      });

      const refreshed = await refreshService.refreshTweetAnalysis(tweetId);

      if (!refreshed) {
        return res.status(404).json({
          error: 'Tweet not found or refresh failed',
        });
      }

      res.json({
        success: true,
        tweet: refreshed,
        message: 'Analysis refreshed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/analysis/refresh-batch - Refresh analysis for multiple tweets
router.post(
  '/refresh-batch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tweetIds } = req.body;

      if (!Array.isArray(tweetIds) || tweetIds.length === 0) {
        return res.status(400).json({
          error: 'tweetIds array is required',
        });
      }

      const locals = getAppLocals(req);
      const { tweetDB, marketMatcher, tweetAnalyzer } = locals;

      const refreshService = new AnalysisRefreshService({
        tweetDB,
        marketMatcher,
        tweetAnalyzer,
      });

      const result = await refreshService.refreshTweetsBatch(tweetIds);

      res.json({
        success: true,
        ...result,
        message: `Refreshed ${result.refreshed} out of ${tweetIds.length} tweets`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/analysis/refresh-stale - Refresh stale analyses (auto-refresh)
router.post(
  '/refresh-stale',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = 50 } = req.query;
      const locals = getAppLocals(req);
      const { tweetDB, marketMatcher, tweetAnalyzer } = locals;

      const refreshService = new AnalysisRefreshService({
        tweetDB,
        marketMatcher,
        tweetAnalyzer,
      });

      const refreshed = await refreshService.refreshStaleAnalyses(
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        refreshed,
        message: `Refreshed ${refreshed} stale analyses`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

