import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticateApiAccess } from './src/middleware/simpleAuth.js';

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
}));

// CORS configuration function - will be called after env is loaded
export const setupCors = () => {
    const getFrontendUrl = () => {
        if (process.env.NODE_ENV === 'DEV' || process.env.NODE_ENV === 'development') {
            return process.env.FRONTEND_DEV_URL?.split(',') || ['http://localhost:8000', 'http://localhost:5173'];
        } else {
            return process.env.FRONTEND_PROD_URL?.split(',') || ['http://polywhisper.io'];
        }
    };

    const allowedOrigins = getFrontendUrl();
    console.log(`🌐 CORS Origins (${process.env.NODE_ENV || 'undefined'}):`, allowedOrigins);

    const corsOptions = {
        origin: allowedOrigins,
        credentials: true,
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));
};

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
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Root endpoint (public)
app.get('/', (req, res) => {
    res.json({
        message: 'PolySense Backend API',
        status: 'running',
        version: process.env.npm_package_version || '1.0.0',
        authentication: 'Simple token-based authentication',
        endpoints: {
            health: 'GET /health (public)',
            tweets: {
                list: 'GET /api/tweets (protected)',
                latest: 'GET /api/tweets/latest (protected)',
                analyze: 'GET /api/tweets/analyze (protected)'
            },
            websocket: {
                connect: 'WS /ws?token=<api_token>',
                status: 'GET /api/websocket/status (protected)'
            }
        },
        usage: {
            header: 'x-api-key: <your_token> OR Authorization: Bearer <your_token>',
            websocket: 'ws://localhost:3000/ws?token=<your_token>'
        }
    });
});

// Protected routes middleware
app.use('/api/tweets', authenticateApiAccess);
app.use('/api/websocket', authenticateApiAccess);

// Tweet routes (protected)
app.get('/api/tweets', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Get tweets from global variable (will be properly injected)
    const tweets = req.app.locals.tweets || [];
    const paginatedTweets = tweets.slice(offset, offset + limit);

    res.json({
        tweets: paginatedTweets,
        total: tweets.length,
        limit,
        offset,
        hasMore: offset + limit < tweets.length,
        client: req.auth.client
    });
});

app.get('/api/tweets/latest', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    const tweets = req.app.locals.tweets || [];
    const latestTweets = tweets.slice(0, count);

    res.json({
        tweets: latestTweets,
        count: latestTweets.length,
        client: req.auth.client
    });
});

app.get('/api/tweets/analyze', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 10;
        const useLLM = req.query.llm === 'true';
        const tweets = req.app.locals.tweets || [];
        const latestTweets = tweets.slice(0, count);

        // Get services from app locals (will be injected)
        const tweetAnalyzer = req.app.locals.tweetAnalyzer;
        const polymarketService = req.app.locals.polymarketService;

        if (!tweetAnalyzer || !polymarketService) {
            return res.status(500).json({
                error: 'Analysis services not available'
            });
        }

        const analyzedTweets = [];
        const marketSummary = {};
        const keywordFrequency = {};
        const categorySummary = {};

        for (const tweet of latestTweets) {
            let analysis;
            let polymarketMatches = [];

            // Check if tweet is already enriched
            if (tweet.analysis && tweet.polymarketMatches) {
                analysis = tweet.analysis;
                polymarketMatches = tweet.polymarketMatches;
            } else {
                const tweetText = tweet.text || tweet.message || JSON.stringify(tweet);

                if (useLLM) {
                    analysis = await tweetAnalyzer.analyzeWithLLM(tweetText);
                } else {
                    analysis = tweetAnalyzer.analyzeTweet(tweetText);
                }

                for (const keyword of analysis.keywords || []) {
                    try {
                        const data = await polymarketService.search(keyword, { size: 3 });
                        polymarketMatches.push({ keyword, data });
                    } catch (err) {
                        console.error('Polymarket search failed for keyword', keyword, err?.message || err);
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

            for (const match of polymarketMatches) {
                const marketCount = match.data?.results?.length || 0;
                if (marketCount > 0) {
                    marketSummary[match.keyword] = (marketSummary[match.keyword] || 0) + marketCount;
                }
            }
        }

        // Sort summaries
        const topKeywords = Object.entries(keywordFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        const topCategories = Object.entries(categorySummary).sort(([, a], [, b]) => b - a);
        const topMarkets = Object.entries(marketSummary)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        res.json({
            summary: {
                tweetsAnalyzed: analyzedTweets.length,
                uniqueKeywords: Object.keys(keywordFrequency).length,
                topKeywords: topKeywords.map(([kw, count]) => ({ keyword: kw, frequency: count })),
                topCategories: topCategories.map(([cat, count]) => ({ category: cat, frequency: count })),
                topMarkets: topMarkets.map(([kw, count]) => ({ keyword: kw, marketsFound: count })),
                analyzedAt: new Date().toISOString(),
            },
            tweets: analyzedTweets,
            client: req.auth.client
        });
    } catch (error) {
        console.error('Tweet analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze tweets',
            message: error.message,
        });
    }
});

// WebSocket status route (protected)
app.get('/api/websocket/status', (req, res) => {
    const twitterWS = req.app.locals.twitterWS;
    const clientWS = req.app.locals.clientWS;

    res.json({
        twitter: twitterWS ? twitterWS.getConnectionStatus() : { status: 'not_initialized' },
        frontend: clientWS ? clientWS.getStats() : { status: 'not_initialized' },
        client: req.auth.client
    });
});

app.post('/api/websocket/reconnect', (req, res) => {
    try {
        const twitterWS = req.app.locals.twitterWS;
        if (!twitterWS) {
            return res.status(500).json({
                error: 'Twitter WebSocket service not available'
            });
        }

        console.log(`🔄 Manual reconnection requested by ${req.auth.client}`);
        twitterWS.forceReconnect();

        res.json({
            message: 'Force reconnection initiated',
            timestamp: new Date().toISOString(),
            client: req.auth.client
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
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

export default app;