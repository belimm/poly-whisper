/**
 * Market routes
 * Handles market catalog and matching API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { AppLocals } from '../types/index.js';

const router = Router();

// Middleware to get app locals
const getAppLocals = (req: Request): AppLocals => {
  return req.app.locals as AppLocals;
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

// GET /api/markets/details/:id - Get single market details by ID
router.get(
  '/details/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const locals = getAppLocals(req);
      const { marketCatalogService } = locals;

      if (!marketCatalogService) {
        return res.status(503).json({
          error: 'Market catalog service not available',
        });
      }

      const market = marketCatalogService.getMarketById(id);

      if (!market) {
        return res.status(404).json({
          error: 'Market not found',
          marketId: id,
        });
      }

      const stats = marketCatalogService.getStats();

      res.json({
        market,
        timestamp: new Date().toISOString(),
        lastRefreshTime: stats.lastRefresh,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/markets/details - Get multiple market details by IDs
router.post(
  '/details',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids } = req.body;

      if (!ids) {
        return res.status(400).json({
          error: 'Missing required field: ids',
        });
      }

      if (!Array.isArray(ids)) {
        return res.status(400).json({
          error: 'ids must be an array of market IDs',
        });
      }

      if (ids.length === 0) {
        return res.status(400).json({
          error: 'ids array cannot be empty',
        });
      }

      if (ids.length > 100) {
        return res.status(400).json({
          error: 'Maximum 100 market IDs allowed per request',
        });
      }

      const locals = getAppLocals(req);
      const { marketCatalogService } = locals;

      if (!marketCatalogService) {
        return res.status(503).json({
          error: 'Market catalog service not available',
        });
      }

      const markets = ids
        .map(id => marketCatalogService.getMarketById(id))
        .filter(m => m !== null);

      const foundIds = markets.map(m => m.id);
      const notFoundIds = ids.filter(id => !foundIds.includes(id));

      const stats = marketCatalogService.getStats();

      res.json({
        markets,
        found: markets.length,
        requested: ids.length,
        notFound: notFoundIds,
        timestamp: new Date().toISOString(),
        lastRefreshTime: stats.lastRefresh,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

