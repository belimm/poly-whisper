import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import tweetRoutes from './src/routes/tweetRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import {getFrontendUrl} from './src/utils/util.js';
// Create Express app
const app = express();

app.use(
   cors({
      origin: getFrontendUrl(),
      credentials: true, // Allow cookies/auth headers
      optionsSuccessStatus: 200,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'], // Specify your headers
      exposedHeaders: ['X-Custom-Response-Header'], // Headers client can read
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
app.use((req, res, next) => {
   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
   next();
});

// Health check route (public)
app.get('/health', (req, res) => {
   res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
   });
});

// Root endpoint (public)
app.get('/', (req, res) => {
   res.json({
      message: 'PolySense Backend API',
      status: 'running',
      version: process.env.npm_package_version || '1.0.0',
      authentication: 'Dual authentication (Supabase JWT + Simple Token)',
      endpoints: {
         v2: {
            tweets: {
               list: 'GET /api/v2/tweets (Supabase auth)',
               latest: 'GET /api/v2/tweets/latest (Supabase auth)',
               withAnalysis: 'GET /api/v2/tweets/with-analysis (Supabase auth)',
               search: 'GET /api/v2/tweets/search?q=keyword (Supabase auth)',
               statistics: 'GET /api/v2/tweets/statistics (Supabase auth)',
            },
            user: {
               profile: 'GET/PUT /api/v2/user/profile (Supabase auth)',
               interactions:
                  'GET/POST/DELETE /api/v2/user/interactions (Supabase auth)',
            },
         },
         legacy: {
            websocket: {
               connect: 'WS /ws?token=<api_token>',
               status: 'GET /api/websocket/status (Simple token)',
            },
         },
      },
      usage: {
         supabaseAuth: 'Authorization: Bearer <supabase_jwt_token>',
         websocket: 'ws://localhost:3000/ws?token=<your_token>',
      },
   });
});

// Register new Supabase-authenticated routes (v2)
app.use('/api/tweets', tweetRoutes);
app.use('/api/user', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
   console.error('Express error:', err);
   res.status(err.status || 500).json({
      error: 'Internal server error',
      message:
         process.env.NODE_ENV === 'development'
            ? err.message
            : 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
   });
});

// 404 handler
app.use((req, res) => {
   res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
   });
});

export default app;
