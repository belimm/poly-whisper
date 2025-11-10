# PolySense Backend Setup Guide

## Architecture Overview

### System Flow

```
Twitter API (WS) → Backend → LLM Analysis → Supabase Database
                      ↓
                 WebSocket → Authenticated Clients (Frontend)
```

### Key Components

1. **Twitter WebSocket Service**: Connects to twitterapi.io to monitor tweets
2. **Tweet Pipeline**: Processes incoming tweets and enriches them with LLM analysis
3. **LLM Analyzer**: Uses Google Gemini to analyze tweet sentiment, extract keywords, and categorize
4. **Polymarket Service**: Searches for relevant prediction markets based on keywords
5. **Database Service**: Persists tweets, analyses, and user data to Supabase
6. **Client WebSocket**: Broadcasts real-time tweets to authenticated frontend clients
7. **REST API**: Provides endpoints for retrieving archived tweets and user management

---

## Prerequisites

1. Node.js (v18 or higher)
2. A Supabase account and project
3. Twitter API access via twitterapi.io
4. Google Gemini API key (for LLM analysis)

---

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Note down your project credentials:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public key
   - Service role key (keep this secret!)

### 1.2 Run Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase-schema.sql` from this project
4. Copy and paste the entire content into the SQL Editor
5. Click "Run" to create all tables, indexes, and Row Level Security policies

This will create:
- `user_profiles` - User profile data
- `tweets` - Raw tweet data
- `tweet_analyses` - LLM analysis results
- `polymarket_matches` - Polymarket search results
- `user_interactions` - User bookmarks, favorites, etc.

### 1.3 Enable Authentication

1. Go to **Authentication** > **Providers** in Supabase dashboard
2. Enable **Email** authentication (or other providers like Google, GitHub)
3. Configure email templates if needed
4. Enable email confirmations (recommended for production)

---

## Step 2: Environment Configuration

### 2.1 Create `.env` File

Copy your existing `.env` or create a new one with these additional variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URLs (comma-separated for multiple origins)
FRONTEND_DEV_URL=http://localhost:3001,http://localhost:8000
FRONTEND_PROD_URL=https://your-production-url.com

# Twitter API Configuration (twitterapi.io)
TWITTER_WS_URL=your_twitter_websocket_url
TWITTER_API_KEY=your_twitter_api_key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google Gemini API (for LLM analysis)
GOOGLE_API_KEY=your_google_gemini_api_key

# Polymarket API (optional)
POLYMARKET_API_URL=https://polymarket.com/api
```

**Important**: Never commit the `.env` file to version control!

---

## Step 3: Install Dependencies

```bash
npm install
```

This will install the new `@supabase/supabase-js` package along with existing dependencies.

---

## Step 4: Start the Backend

```bash
npm run dev
```

The backend will:
1. Connect to Supabase and verify configuration
2. Register new API routes at `/api/v2/*`
3. Connect to Twitter WebSocket for tweet monitoring
4. Start WebSocket server for frontend clients
5. Begin processing and persisting tweets

---

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /` - API documentation

### Protected Endpoints (Require Supabase Auth)

All endpoints below require an `Authorization: Bearer <token>` header with a valid Supabase JWT token.

#### Tweet Endpoints

- `GET /api/v2/tweets` - Get paginated tweets
  - Query params: `limit` (default: 10), `offset` (default: 0)

- `GET /api/v2/tweets/latest` - Get latest tweets
  - Query params: `count` (default: 10)

- `GET /api/v2/tweets/with-analysis` - Get tweets with their analyses
  - Query params: `limit` (default: 10), `offset` (default: 0)

- `GET /api/v2/tweets/search` - Search tweets by keyword
  - Query params: `q` (required), `limit` (default: 50)

- `GET /api/v2/tweets/statistics` - Get tweet statistics

#### User Endpoints

- `GET /api/v2/user/profile` - Get current user's profile
- `PUT /api/v2/user/profile` - Update user profile
  - Body: `{ username, display_name, preferences }`

- `GET /api/v2/user/interactions` - Get user's interactions (bookmarks, etc.)
  - Query params: `type` (optional), `limit`, `offset`

- `POST /api/v2/user/interactions` - Create new interaction
  - Body: `{ tweet_id, interaction_type, note }`

- `DELETE /api/v2/user/interactions/:interactionId` - Delete interaction

### Legacy Endpoints (Simple Token Auth)

The old `/api/tweets` endpoints are still available using the simple token authentication for backwards compatibility.

---

## WebSocket Connection

### For Frontend Clients with Supabase Auth

The WebSocket currently uses simple token auth. To upgrade to Supabase auth:

**Current (Simple Token):**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=<simple_api_token>');
```

**Future (Supabase JWT):**
```javascript
// After user logs in via Supabase
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;

const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
```

### WebSocket Message Types

**Incoming (from server):**
- `welcome` - Connection established
- `newTweet` - New enriched tweet
- `system` - System messages (info, warning, error)
- `pong` - Response to ping

**Outgoing (to server):**
- `ping` - Heartbeat
- `subscribe` - Subscribe to specific keywords/categories
- `getStats` - Request connection statistics

---

## Frontend Integration Guide

### Authentication Flow

1. **User Sign Up/Login** (via Supabase)
2. **Get JWT Token** from Supabase session
3. **Call Backend APIs** with token in Authorization header
4. **Connect to WebSocket** with token for real-time updates

### Example Frontend Code

```typescript
// 1. Initialize Supabase Client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 2. Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// 3. Sign in
const { data: { session }, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// 4. Make authenticated API calls
const response = await fetch('http://localhost:3000/api/v2/tweets/latest', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
});

// 5. Connect to WebSocket
const ws = new WebSocket(`ws://localhost:3000/ws?token=${session.access_token}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'newTweet') {
    // Handle new tweet
    console.log('New tweet:', message.data);
  }
};
```

---

## Database Service Usage

The `TweetDatabaseService` is now integrated into the pipeline and automatically saves enriched tweets. You can also use it directly:

```javascript
import TweetDatabaseService from './src/services/database/tweetDatabaseService.js';

const tweetDB = new TweetDatabaseService();

// Get latest tweets from database
const { tweets, total } = await tweetDB.getLatestTweets(10, 0);

// Get tweets with analyses
const { tweets: analyzed } = await tweetDB.getTweetsWithAnalyses(10, 0);

// Search tweets
const results = await tweetDB.searchTweets('bitcoin', 50);

// Get statistics
const stats = await tweetDB.getStatistics();
```

---

## Security Notes

### Row Level Security (RLS)

Supabase RLS policies are configured to:
- Allow all authenticated users to read tweets and analyses
- Allow users to only manage their own profile and interactions
- Use service role for backend operations (bypasses RLS)

### Best Practices

1. **Never expose service role key** - Only use in backend
2. **Always validate JWT tokens** - Done automatically by middleware
3. **Use HTTPS in production** - Especially for WebSocket connections
4. **Rate limit API calls** - Consider implementing rate limiting
5. **Monitor database usage** - Check Supabase dashboard regularly

---

## Troubleshooting

### Supabase Connection Issues

```
❌ SUPABASE_URL is not defined in environment variables
```
**Solution**: Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to your `.env` file.

### Authentication Errors

```
401 Unauthorized - Invalid or expired token
```
**Solution**: Ensure the JWT token from Supabase is being passed correctly in the `Authorization: Bearer <token>` header.

### Database Insert Errors

```
Failed to save tweet to database
```
**Solution**:
1. Check if the schema is correctly created in Supabase
2. Verify service role key has proper permissions
3. Check Supabase logs in the dashboard

### WebSocket Connection Fails

```
WebSocket authentication failed
```
**Solution**: Currently using simple token auth. Ensure you're passing a valid token. For Supabase JWT support, modifications to `clientWebSocket.js` are needed.

---

## Next Steps

1. **Test the API endpoints** using Postman or curl
2. **Integrate frontend authentication** with Supabase Auth
3. **Create protected pages** in Next.js using Supabase session
4. **Display real-time tweets** via WebSocket
5. **Implement user features** like bookmarks and favorites
6. **Add pagination** to tweet archives
7. **Create dashboard** with statistics and analytics

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
