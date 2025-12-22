/**
 * Express application setup
 * Best practices: Security, CORS, error handling, middleware
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getFrontendUrl } from './utils/util.js';
import tweetRoutes from './routes/tweetRoutes.js';
import userRoutes from './routes/userRoutes.js';
import type { AppLocals } from './types/index.js';

// Create Express app
const app: Express = express();

// CORS configuration
app.use(
   cors({
      origin: getFrontendUrl(),
      credentials: true,
      optionsSuccessStatus: 200,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
      exposedHeaders: ['X-Custom-Response-Header'],
   })
);

// Security middleware
app.use(
   helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
         directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
         },
      },
   })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
   next();
});

// Health check route (public)
app.get('/health', (req: Request, res: Response) => {
   res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
   });
});

// Root endpoint (public)
app.get('/', (req: Request, res: Response) => {
   res.json({
      message: 'Poly-Whisper Backend API',
      status: 'running',
      version: process.env.npm_package_version || '1.0.0',
      authentication: 'Supabase JWT',
      endpoints: {
         v2: {
            tweets: {
               list: 'GET /api/tweets (Supabase auth)',
               latest: 'GET /api/tweets/latest (Supabase auth)',
               withAnalysis: 'GET /api/tweets/with-analysis (Supabase auth)',
               search: 'GET /api/tweets/search?q=keyword (Supabase auth)',
               statistics: 'GET /api/tweets/statistics (Supabase auth)',
            },
            user: {
               profile: 'GET/PUT /api/user/profile (Supabase auth)',
               interactions:
                  'GET/POST/DELETE /api/user/interactions (Supabase auth)',
            },
            markets: {
               catalogStats: 'GET /api/markets/catalog/stats (Supabase auth)',
               refresh: 'POST /api/markets/catalog/refresh (Supabase auth)',
            },
         },
         websocket: {
            connect: 'WS /ws',
            status: 'GET /api/websocket/status',
         },
      },
      usage: {
         supabaseAuth: 'Authorization: Bearer <supabase_jwt_token>',
         websocket: 'ws://localhost:3000/ws',
      },
   });
});

// Register routes
app.use('/api/tweets', tweetRoutes);
app.use('/api/user', userRoutes);

// Import and register market routes
import marketRoutes from './routes/marketRoutes.js';
app.use('/api/markets', marketRoutes);

// Import and register analysis routes
import analysisRoutes from './routes/analysisRoutes.js';
app.use('/api/analysis', analysisRoutes);

// Error handling middleware
app.use(
   (
      err: Error & { status?: number },
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      console.error('Express error:', err);
      res.status(err.status || 500).json({
         error: 'Internal server error',
         message:
            process.env.NODE_ENV === 'development'
               ? err.message
               : 'Something went wrong',
         ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      });
   }
);

// 404 handler
app.use((req: Request, res: Response) => {
   res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
   });
});

// Extend Express Request to include app locals
declare global {
   namespace Express {
      interface Application {
         locals: AppLocals;
      }
   }
}

export default app;
