# 🎯 PolySense Backend

<div align="center">

**Real-time Twitter sentiment analysis and Polymarket prediction market correlation engine**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-blue.svg)](https://expressjs.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange.svg)](https://github.com/websockets/ws)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Technologies](#-technologies)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [WebSocket Integration](#-websocket-integration)
- [Project Structure](#-project-structure)
- [Security](#-security)
- [Deployment](#-deployment)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

PolySense Backend is a sophisticated Node.js service that bridges Twitter's real-time data stream with Polymarket's prediction markets. It analyzes tweets using AI-powered sentiment analysis, extracts prediction-worthy keywords, and correlates them with relevant betting markets in real-time.

### What It Does

1. **Listens to Twitter** - Connects to Twitter's real-time tweet stream via twitterapi.io WebSocket
2. **Analyzes Content** - Uses Google's Gemini AI to extract entities, sentiment, and market-relevant keywords
3. **Correlates Markets** - Searches Polymarket for prediction markets matching tweet topics
4. **Broadcasts Results** - Sends enriched data to frontend clients via WebSocket

---

## 🏗️ Architecture

```
┌─────────────────────┐
│   twitterapi.io     │
│   (Tweet Stream)    │
└──────────┬──────────┘
           │ WebSocket
           │ Retrieved Tweets
           ▼
┌─────────────────────┐
│   Node.JS Backend   │◄─── Retrieved Tweets
│  (PolySense Core)   │
└──────────┬──────────┘
           │
           ├──────────► ┌──────────────────────┐
           │            │  Pre-Trained / Fine  │
           │            │   Tuned LLM (Gemini) │
           │            └──────────────────────┘
           │                     │
           │◄────────────────────┘
           │            Analyzed Tweets
           │
           ├──────────► ┌──────────────────────┐
           │            │     PolyMarket       │
           │            │   (Prediction API)   │
           │            └──────────────────────┘
           │◄────────────────────┘
           │        Possible Markets
           │
           ▼
    [Frontend Clients]
    WebSocket Broadcasting
```

### Data Flow

1. **Ingestion**: Twitter WebSocket → Tweet Pipeline
2. **Analysis**: Tweet Analyzer (Heuristic + LLM) → Keyword Extraction
3. **Enrichment**: Polymarket Service → Market Correlation
4. **Distribution**: Client WebSocket → Frontend Broadcasting

---

## ✨ Key Features

### 🔐 Authentication & Security
- ✅ **Simple Token-Based Authentication** - No login/register complexity
- ✅ **Long-Lived JWT Tokens** (365 days) for trusted frontend clients
- ✅ **Secure WebSocket Authentication** via query parameters
- ✅ **CORS Protection** with environment-based origin whitelisting
- ✅ **Helmet Security Headers** for API protection

### 🐦 Real-Time Tweet Processing
- ✅ **Twitter WebSocket Integration** with twitterapi.io
- ✅ **Automatic Reconnection** with exponential backoff (max 5 attempts)
- ✅ **Tweet Normalization** with structured metadata
- ✅ **In-Memory Storage** with automatic rotation (1000 tweets max)
- ✅ **Duplicate Detection** and filtering

### 🤖 AI-Powered Analysis
- ✅ **Dual Analysis System**: Heuristic + LLM (Google Gemini)
- ✅ **Entity Extraction**: Companies, people, financial instruments, events
- ✅ **Sentiment Analysis**: Positive/Negative/Neutral with confidence scores
- ✅ **Keyword Extraction**: Multi-word phrases optimized for prediction markets
- ✅ **Smart Fallback**: Heuristic analysis when LLM fails
- ✅ **Stop Word Filtering**: Removes irrelevant terms from search queries

### 📊 Polymarket Integration
- ✅ **Market Search API** integration
- ✅ **Keyword-Based Correlation** with tweet topics
- ✅ **Batch Processing** for multiple keywords per tweet
- ✅ **Result Aggregation** with metadata preservation

### 🔌 WebSocket Broadcasting
- ✅ **Real-Time Client Updates** via WebSocket
- ✅ **Subscription Filtering** by keywords/sentiment
- ✅ **Connection Management** with auth validation
- ✅ **System Notifications** (connection status, errors)
- ✅ **Heartbeat/Ping** support for connection health

### 🚀 Production Ready
- ✅ **Docker Support** with multi-stage builds
- ✅ **Docker Compose** configuration with nginx/redis profiles
- ✅ **Health Check Endpoints** for monitoring
- ✅ **Graceful Shutdown** handling
- ✅ **Environment-Based Configuration**
- ✅ **Production Logging** with structured output

---

## 📦 Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Runtime** | Node.js 20+ | JavaScript runtime environment |
| **Framework** | Express 5.1.0 | REST API server |
| **WebSocket** | ws 8.18.3 | Real-time bidirectional communication |
| **AI/ML** | Google Gemini (@google/genai) | Tweet analysis and entity extraction |
| **Security** | jsonwebtoken 9.0.2 | JWT-based authentication |
| **Security** | helmet 8.1.0 | HTTP security headers |
| **HTTP** | cors 2.8.5 | Cross-Origin Resource Sharing |
| **Utils** | uuid 13.0.0 | Unique identifier generation |
| **Config** | dotenv 17.2.3 | Environment variable management |

### Development Dependencies
- TypeScript 5.9.3
- @types/express 5.0.4
- @types/node 24.9.1

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** 20+ and npm
- **Twitter API Key** from [twitterapi.io](https://twitterapi.io)
- **Google AI API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Polymarket API Access** (optional, defaults to public API)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/belimm/poly-sense.git
cd poly-sense-be

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your API keys (see Configuration section)
nano .env

# Start development server (with hot reload)
npm run dev

# Or start production server
npm start
```

Server will run at: **http://localhost:3000**

---

## ⚙️ Configuration


### Generating API Token for Frontend

After starting the server, an API token is automatically generated and logged to console:

```bash
npm start
```

Look for:
```
🔑 Generated Frontend API Token (save this):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnQiOiJwb...
```

Copy this token to your frontend's `.env` file:
```bash
# Frontend .env
VITE_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## 📡 API Reference

### Base URL
```
http://localhost:3000
```

### Authentication

All protected endpoints require authentication via:

**Option 1: Bearer Token (Recommended)**
```bash
Authorization: Bearer YOUR_API_TOKEN
```

**Option 2: API Key Header**
```bash
x-api-key: YOUR_API_TOKEN
```

---

### Endpoints

#### `GET /health` 
**Public** - Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-04T10:30:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "version": "1.0.5"
}
```

---

#### `GET /`
**Public** - API information and documentation

**Response:**
```json
{
  "message": "PolySense Backend API",
  "status": "running",
  "version": "1.0.5",
  "authentication": "Simple token-based authentication",
  "endpoints": {
    "health": "GET /health (public)",
    "tweets": {
      "list": "GET /api/tweets (protected)",
      "latest": "GET /api/tweets/latest (protected)",
      "analyze": "GET /api/tweets/analyze (protected)"
    },
    "websocket": {
      "connect": "WS /ws?token=<api_token>",
      "status": "GET /api/websocket/status (protected)"
    }
  }
}
```

---

#### `GET /api/tweets`
**Protected** - Get paginated list of stored tweets

**Query Parameters:**
- `limit` (number, default: 50) - Number of tweets to return
- `offset` (number, default: 0) - Pagination offset

**Example:**
```bash
curl -H "x-api-key: YOUR_TOKEN" \
  "http://localhost:3000/api/tweets?limit=10&offset=0"
```

**Response:**
```json
{
  "tweets": [
    {
      "original": { "tweetId": "123...", "text": "..." },
      "text": "Bitcoin hits new high...",
      "analysis": {
        "keywords": ["bitcoin", "price", "ath"],
        "categories": ["crypto", "finance"],
        "sentiment": "positive",
        "confidence": 0.92
      },
      "polymarketMatches": [
        {
          "keyword": "bitcoin",
          "data": { "markets": [...] }
        }
      ],
      "enrichedAt": "2025-11-04T10:30:00.000Z"
    }
  ],
  "total": 250,
  "limit": 10,
  "offset": 0,
  "hasMore": true
}
```

---

#### `GET /api/tweets/latest`
**Protected** - Get most recent tweets

**Query Parameters:**
- `count` (number, default: 10) - Number of tweets to return

**Example:**
```bash
curl -H "x-api-key: YOUR_TOKEN" \
  "http://localhost:3000/api/tweets/latest?count=5"
```

**Response:**
```json
{
  "tweets": [...],
  "count": 5,
  "client": "frontend-client"
}
```

---

#### `GET /api/tweets/analyze`
**Protected** - Get analyzed tweets with statistics

**Query Parameters:**
- `count` (number, default: 10) - Number of tweets to analyze
- `llm` (boolean, default: false) - Use LLM for analysis

**Example:**
```bash
curl -H "x-api-key: YOUR_TOKEN" \
  "http://localhost:3000/api/tweets/analyze?count=20&llm=true"
```

**Response:**
```json
{
  "tweets": [...],
  "summary": {
    "totalTweets": 20,
    "totalMarkets": 45,
    "topKeywords": [
      { "keyword": "bitcoin", "count": 12 },
      { "keyword": "election", "count": 8 }
    ],
    "categoryDistribution": {
      "crypto": 12,
      "politics": 8
    },
    "sentimentDistribution": {
      "positive": 15,
      "negative": 3,
      "neutral": 2
    }
  }
}
```

---

#### `GET /api/websocket/status`
**Protected** - Get WebSocket service status

**Response:**
```json
{
  "twitter": {
    "connected": true,
    "reconnectAttempts": 0
  },
  "frontend": {
    "serverRunning": true,
    "connectedClients": 3
  },
  "timestamp": "2025-11-04T10:30:00.000Z"
}
```

---

## 🔌 WebSocket Integration

### Connection

**URL:** `ws://localhost:3000/ws?token=YOUR_API_TOKEN`

### Frontend Example (JavaScript)

```javascript
// Connect to WebSocket
const API_TOKEN = import.meta.env.VITE_API_TOKEN;
const ws = new WebSocket(`ws://localhost:3000/ws?token=${API_TOKEN}`);

// Connection opened
ws.onopen = () => {
  console.log('✅ Connected to PolySense');
  
  // Subscribe to specific keywords
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: {
      keywords: ['bitcoin', 'election', 'tesla'],
      sentiment: 'positive'  // Optional filter
    }
  }));
};

// Receive messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'welcome':
      console.log('Welcome:', message.message);
      break;
      
    case 'newTweet':
      console.log('📧 New analyzed tweet:', message.data);
      // message.data contains: original, text, analysis, polymarketMatches
      handleNewTweet(message.data);
      break;
      
    case 'systemMessage':
      console.log(`System [${message.level}]:`, message.message);
      break;
      
    case 'subscribed':
      console.log('Subscription updated:', message.data);
      break;
  }
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Handle disconnection
ws.onclose = (event) => {
  console.log('Disconnected:', event.code, event.reason);
};

// Example: Process new tweet
function handleNewTweet(enrichedTweet) {
  const { text, analysis, polymarketMatches } = enrichedTweet;
  
  console.log('Tweet:', text);
  console.log('Keywords:', analysis.keywords);
  console.log('Sentiment:', analysis.sentiment, analysis.confidence);
  console.log('Markets found:', polymarketMatches.length);
  
  // Update your UI here
  updateTweetFeed(enrichedTweet);
}
```

### Client Message Types

#### Subscribe to Filtered Content
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  data: {
    keywords: ['bitcoin', 'election'],
    sentiment: 'positive'  // Optional: 'positive' | 'negative' | 'neutral'
  }
}));
```

#### Ping/Pong (Health Check)
```javascript
ws.send(JSON.stringify({ type: 'ping' }));
// Response: { type: 'pong', timestamp: '2025-11-04T...' }
```

#### Get Statistics
```javascript
ws.send(JSON.stringify({ type: 'getStats' }));
```

### Server Message Types

| Type | Description | Data Structure |
|------|-------------|----------------|
| `welcome` | Connection confirmation | `{ message, client, authType, timestamp }` |
| `newTweet` | Analyzed tweet with markets | `{ data: enrichedTweet, timestamp }` |
| `systemMessage` | System notifications | `{ message, level: 'info'|'warning'|'error' }` |
| `subscribed` | Subscription confirmation | `{ data: subscriptionFilters }` |
| `pong` | Ping response | `{ timestamp }` |
| `error` | Error message | `{ message }` |

---

## 📂 Project Structure

```
poly-whisper-be/
├── 📄 index.js                    # Application entry point
├── 📄 app.js                      # Express app configuration
├── 📄 package.json                # Dependencies and scripts
├── 📄 Dockerfile                  # Docker container config
├── 📄 docker-compose.yml          # Multi-container setup
├── 📄 .env                        # Environment variables (create from .env.example)
│
├── 📁 src/
│   ├── 📁 domain/                 # Business logic
│   │   └── tweetAnalyzer.js      # Tweet analysis (heuristic + LLM)
│   │
│   ├── 📁 infrastructure/         # External integrations
│   │   ├── 📁 client/
│   │   │   └── llmClient.js      # Google Gemini AI client
│   │   └── 📁 websocket/
│   │       ├── twitterWebSocket.js   # Twitter stream connection
│   │       └── clientWebSocket.js    # Frontend WebSocket server
│   │
│   ├── 📁 middleware/             # Express middleware
│   │   └── simpleAuth.js         # JWT authentication
│   │
│   └── 📁 services/               # Application services
│       └── 📁 application/
│           ├── tweetPipeline.js  # Tweet processing pipeline
│           └── polymarketService.js  # Polymarket API client
│
└── 📁 test/                       # Test files and debugging tools
    ├── debug-websocket.js        # WebSocket debugging script
    ├── test-llm.js               # LLM client test
    └── test-websocket.html       # Browser WebSocket test
```

### Key Components

#### `index.js`
- Application bootstrapping
- Service initialization
- WebSocket server setup
- Event handler registration

#### `app.js`
- Express configuration
- Route definitions
- Security middleware
- CORS setup

#### `src/domain/tweetAnalyzer.js`
- Dual analysis system (heuristic + LLM)
- Keyword extraction
- Sentiment analysis
- Entity recognition

#### `src/infrastructure/client/llmClient.js`
- Google Gemini API integration
- Prompt engineering
- Retry logic with exponential backoff
- JSON response parsing

#### `src/infrastructure/websocket/twitterWebSocket.js`
- Twitter stream connection management
- Automatic reconnection
- Message normalization
- Event emission

#### `src/infrastructure/websocket/clientWebSocket.js`
- Frontend client management
- Broadcast functionality
- Subscription filtering
- Connection authentication

#### `src/services/application/tweetPipeline.js`
- Orchestrates tweet processing flow
- Integrates analyzer and Polymarket service
- Emits enriched tweet events

#### `src/services/application/polymarketService.js`
- Polymarket API client
- Market search functionality
- Result parsing

#### `src/middleware/simpleAuth.js`
- JWT token generation
- Token verification
- WebSocket authentication

---

## 🔐 Security

### Implemented Security Measures

1. **Authentication**
   - JWT-based token authentication
   - Long-lived tokens for trusted clients
   - Token validation on all protected routes
   - WebSocket query parameter authentication

2. **HTTP Security**
   - Helmet.js security headers
   - CORS with origin whitelisting
   - Environment-based configuration
   - Content Security Policy (CSP)

3. **Input Validation**
   - JSON parsing error handling
   - Query parameter sanitization
   - Request size limits (10mb)

4. **Rate Limiting** (Recommended)
   ```javascript
   // Add to app.js
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', limiter);
   ```

5. **Environment Variables**
   - Secrets stored in `.env` (not committed)
   - Different configs for dev/prod
   - JWT secret rotation (recommended)

### Security Best Practices

✅ **Do's:**
- Change `JWT_SECRET` in production
- Use strong, random secrets (32+ characters)
- Enable HTTPS in production
- Rotate API tokens periodically
- Monitor authentication failures
- Set up proper CORS origins
- Use environment variables for all secrets

❌ **Don'ts:**
- Never commit `.env` to git
- Never expose API keys in frontend code
- Never use default JWT secrets in production
- Never disable CORS in production
- Never trust user input without validation

---

## 🚀 Deployment

### Docker Deployment (Recommended)

#### Build and Run
```bash
# Build Docker image
docker build -t polysense-backend .

# Run container
docker run -d \
  --name polysense \
  -p 3000:3000 \
  --env-file .env \
  polysense-backend
```

#### Docker Compose
```bash
# Start all services
docker-compose up -d

# Start with nginx reverse proxy
docker-compose --profile production up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Environment Variables

```bash
NODE_ENV=production
PORT=3000
TWITTERAPI_IO_KEY=your_production_twitter_key
GEMINI_API_KEY=your_production_gemini_key
JWT_SECRET=your_super_secret_production_key_min_32_chars
FRONTEND_PROD_URL=https://yourdomain.com,https://www.yourdomain.com
POLYMARKET_API_BASE=https://gamma-api.polymarket.com
```

### Digital Ocean App Platform

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git push origin main
   ```

2. **Create App**
   - Go to Digital Ocean App Platform
   - Select your repository
   - Choose Node.js environment
   - Set build command: `npm install`
   - Set run command: `npm start`

3. **Configure Environment Variables**
   - Add all `.env` variables in app settings
   - Ensure `NODE_ENV=production`

4. **Deploy**
   - Click "Deploy"
   - App will be available at: `https://your-app.ondigitalocean.app`

### Traditional VPS Deployment

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/belimm/poly-sense.git
cd poly-whisper-be

# Install dependencies
npm ci --production

# Create .env file
nano .env
# (Add your production variables)

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start index.js --name polysense

# Set up auto-restart on reboot
pm2 startup
pm2 save

# Monitor application
pm2 monit
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

---

## 👨‍💻 Development

### Development Commands

```bash
# Start development server (hot reload)
npm run dev

# Start production server
npm start

# Run tests (when implemented)
npm test
```

### Testing WebSocket Connection

#### Browser Test
Open `test/test-websocket.html` in a browser:
```bash
# Serve the HTML file
npx http-server test/ -p 8080
# Open http://localhost:8080/test-websocket.html
```

#### Node.js Test
```bash
node test/debug-websocket.js
```

### Testing LLM Integration

```bash
node test/test-llm.js
```

### Debug Mode

Enable verbose logging:
```bash
DEBUG=* npm run dev
```

### Hot Reload

The project uses Node.js built-in watch mode:
```bash
node --watch index.js
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Twitter WebSocket Connection Fails

**Symptoms:**
```
❌ Twitter WebSocket error: Unexpected server response: 401
```

**Solutions:**
- Verify `TWITTERAPI_IO_KEY` is set correctly in `.env`
- Check API key is active on twitterapi.io dashboard
- Ensure no spaces or quotes in environment variable
- Test API key manually:
  ```bash
  curl -H "x-api-key: YOUR_KEY" https://api.twitterapi.io/v1/health
  ```

#### 2. LLM Analysis Fails

**Symptoms:**
```
LLM analysis failed, falling back to heuristics
```

**Solutions:**
- Check `GEMINI_API_KEY` is valid
- Verify API quota on Google AI Studio
- Test LLM client:
  ```bash
  node test/test-llm.js
  ```
- Check for rate limiting errors

#### 3. WebSocket Authentication Fails

**Symptoms:**
```
WebSocket error: Authentication failed
```

**Solutions:**
- Generate new API token:
  ```bash
  npm start
  # Copy token from console
  ```
- Ensure token is passed correctly in URL:
  ```javascript
  ws://localhost:3000/ws?token=YOUR_TOKEN
  ```
- Check JWT secret hasn't changed
- Verify token hasn't expired (default 365 days)

#### 4. CORS Errors

**Symptoms:**
```
Access to fetch at 'http://localhost:3000/api/tweets' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solutions:**
- Add your frontend URL to `FRONTEND_DEV_URL` in `.env`:
  ```bash
  FRONTEND_DEV_URL=http://localhost:5173,http://localhost:8000
  ```
- Restart the server after changing `.env`
- Check `NODE_ENV` matches your environment

#### 5. Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

#### 6. Memory Issues

**Symptoms:**
- Server crashes with heap out of memory
- Slow performance with many tweets

**Solutions:**
- Reduce `MAX_TWEETS_STORED` in `index.js`:
  ```javascript
  const MAX_TWEETS_STORED = 500; // Default: 1000
  ```
- Increase Node.js heap size:
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" npm start
  ```
- Monitor memory usage:
  ```bash
  curl http://localhost:3000/health
  ```

### Debug Checklist

- [ ] All environment variables are set in `.env`
- [ ] API keys are valid and have sufficient quota
- [ ] Port 3000 is available
- [ ] Node.js version is 20 or higher
- [ ] Dependencies are installed (`npm install`)
- [ ] No syntax errors in custom code
- [ ] CORS origins match your frontend URL
- [ ] JWT secret is set (not using default in production)
- [ ] Frontend token matches backend token
- [ ] WebSocket URL is correct (`ws://` not `http://`)

### Getting Help

1. **Check Logs**
   ```bash
   # Docker logs
   docker logs polysense
   
   # PM2 logs
   pm2 logs polysense
   ```

2. **Health Check**
   ```bash
   curl http://localhost:3000/health
   ```

3. **GitHub Issues**
   - Open issue: https://github.com/belimm/poly-sense/issues
   - Include logs, error messages, and environment details

4. **Documentation**
   - Review `PROJECT_SUMMARY.md` for additional setup details

---

## 📝 Notes

### Tweet Storage

- Tweets are stored in-memory (not persisted to disk)
- Maximum storage: 1000 tweets (FIFO rotation)
- To persist tweets, integrate a database (MongoDB, PostgreSQL, Redis)

### Rate Limits

- **Twitter API**: Depends on your twitterapi.io plan
- **Google AI**: 1500 requests/day on free tier
- **Polymarket API**: No official rate limit documentation

### Performance Optimization

- Consider using Redis for caching Polymarket results
- Implement database for persistent tweet storage
- Add rate limiting middleware for API endpoints
- Use load balancer for multiple instances

### Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Redis caching layer
- [ ] Rate limiting middleware
- [ ] Metrics and monitoring (Prometheus/Grafana)
- [ ] Admin dashboard
- [ ] Tweet sentiment trends over time
- [ ] Market prediction accuracy tracking
- [ ] User authentication system (if needed)
- [ ] Multi-language support
- [ ] Historical data analysis

---

## 🎯 API Token Generation

### Automatic Generation (On Startup)

When you start the server, a token is automatically generated:

```bash
npm start

# Console output:
🔑 Generated Frontend API Token (save this):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnQiOiJwb2x5...
```

### Manual Generation

Generate a new token programmatically:

```bash
node -e "const jwt = require('jsonwebtoken'); \
const token = jwt.sign({ \
  client: 'frontend-client', \
  type: 'api_access' \
}, process.env.JWT_SECRET || 'P0ly_Wh1sp3r2025!.', { \
  expiresIn: '365d' \
}); \
console.log('Token:', token);"
```

### Token Structure

```json
{
  "client": "frontend-client",
  "type": "api_access",
  "created": 1730721234567,
  "iat": 1730721234,
  "exp": 1762257234
}
```

---

## 📊 Monitoring & Logs

### Health Monitoring

```bash
# Basic health check
curl http://localhost:3000/health

# WebSocket status
curl -H "x-api-key: YOUR_TOKEN" \
  http://localhost:3000/api/websocket/status
```

### Logs

```bash
# Development logs (console)
npm run dev

# Production logs (Docker)
docker logs -f polysense

# Production logs (PM2)
pm2 logs polysense
```

### Metrics

The `/health` endpoint provides:
- Server uptime
- Memory usage (RSS, heap)
- Server status
- Timestamp

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use ES6+ syntax
- Follow existing code style
- Add comments for complex logic
- Write meaningful commit messages
- Test your changes before submitting

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👤 Author

**Belimdev**
- GitHub: [@belimm](https://github.com/belimm)
- Project: [poly-whisper-be](https://github.com/belimm/poly-sense)

---

## 🙏 Acknowledgments

- [twitterapi.io](https://twitterapi.io) - Twitter real-time streaming
- [Google AI Studio](https://aistudio.google.com) - Gemini LLM API
- [Polymarket](https://polymarket.com) - Prediction market data
- Express.js, Node.js, and the open-source community

---

## 📞 Support

For questions, issues, or feature requests:

- **GitHub Issues**: https://github.com/belimm/poly-sense/issues
- **Documentation**: See `PROJECT_SUMMARY.md` for additional details
- **Email**: [Create issue for contact info]

---

<div align="center">

**Built with ❤️ for PolyWhisper**

⭐ Star this repo if you find it helpful!

[Report Bug](https://github.com/belimm/poly-sense/issues) · [Request Feature](https://github.com/belimm/poly-sense/issues)

</div>
