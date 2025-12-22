/**
 * Market routes
 * Handles market catalog and matching API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { AppLocals } from '../types/index.js';

const router = Router();

// Middleware to get app locals
const getAppLocals = (req: Request): AppLocals => {
  return req.app.locals;
};

// GET /api/markets/catalog/stats - Get catalog statistics
router.get(
  '/catalog/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locals = getAppLocals(req);
      const { marketCatalogService } = locals;

      if (!marketCatalogService) {
        return res.status(503).json({
          error: 'Market catalog service not available',
        });
      }

      const stats = marketCatalogService.getStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/markets/catalog/refresh - Manually trigger catalog refresh
router.post(
  '/catalog/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locals = getAppLocals(req);
      const { marketCatalogService } = locals;

      if (!marketCatalogService) {
        return res.status(503).json({
          error: 'Market catalog service not available',
        });
      }

      // Trigger refresh in background
      marketCatalogService.refresh().catch((error: Error) => {
        console.error('Catalog refresh failed:', error);
      });

      res.json({
        success: true,
        message: 'Catalog refresh started',
        estimatedDuration: 30000, // 30 seconds estimate
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/markets/matching/stats - Get matching statistics
router.get(
  '/matching/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locals = getAppLocals(req);
      const { marketMatcher } = locals;

      if (!marketMatcher) {
        return res.status(503).json({
          error: 'Market matching service not available',
        });
      }

      const stats = marketMatcher.getMatchingStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

