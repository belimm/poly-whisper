# PolySense Backend API

Real-time Twitter monitoring with AI analysis and Polymarket correlation engine.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-blue.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green.svg)](https://supabase.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange.svg)](https://github.com/websockets/ws)

---

## 📋 Table of Contents

- [Overview](#overview)
- [For Frontend Developers](#for-frontend-developers)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [WebSocket Integration](#websocket-integration)
- [Data Format](#data-format)
- [Authentication](#authentication)
- [Environment Setup](#environment-setup)

---

## Overview

PolySense monitors Twitter in real-time, analyzes tweets with AI (Google Gemini), and correlates them with Polymarket prediction markets.

**What you get:**
- Real-time tweet stream via WebSocket
- AI-powered sentiment analysis
- Keyword extraction and categorization
- Polymarket prediction market matching
- Historical tweet archives via REST API
- User authentication with Supabase

---

## For Frontend Developers

### Quick Start Integration

**1. Install Supabase Client**
```bash
npm install @supabase/supabase-js
```

**2. Initialize Supabase**
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**3. Get JWT Token**
```typescript
// Login user
const { data: { session }, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = session.access_token; // Use this for API calls
```

**4. Fetch Tweets from API**
```typescript
const response = await fetch('http://localhost:3000/api/v2/tweets/latest?count=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { tweets } = await response.json();
```

**5. Connect to WebSocket**
```typescript
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'newTweet') {
    const tweet = message.data;
    // Handle new tweet
    console.log('New tweet:', tweet);
  }
};
```

---

## Architecture

### System Overview

```
┌──────────────────┐
│  Twitter API     │ (via twitterapi.io WebSocket)
└────────┬─────────┘
         │ Real-time tweets
         ▼
┌──────────────────────────────────────────────────┐
│           PolySense Backend                       │
│                                                   │
│  ┌──────────────┐    ┌──────────────┐           │
│  │ Tweet        │───▶│ AI Analysis  │           │
│  │ Pipeline     │    │ (Gemini)     │           │
│  └──────────────┘    └──────────────┘           │
│         │                    │                    │
│         ▼                    ▼                    │
│  ┌──────────────┐    ┌──────────────┐           │
│  │ Polymarket   │    │ Supabase DB  │           │
│  │ Search       │    │ (Postgres)   │           │
│  └──────────────┘    └──────────────┘           │
│         │                    │                    │
│         └────────┬───────────┘                   │
│                  ▼                                │
│         ┌──────────────────┐                     │
│         │  Enriched Tweet  │                     │
│         └──────────────────┘                     │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌─────────────┐    ┌──────────────┐
│ WebSocket   │    │ REST API     │
│ (Real-time) │    │ (Archives)   │
└──────┬──────┘    └──────┬───────┘
       │                  │
       └────────┬─────────┘
                ▼
     ┌────────────────────┐
     │  Frontend Clients  │
     │  (Next.js/React)   │
     └────────────────────┘
```

### Data Flow

1. **Twitter Stream** → Backend receives tweets via WebSocket
2. **AI Analysis** → Google Gemini analyzes sentiment, extracts keywords
3. **Market Search** → Polymarket API searches for relevant prediction markets
4. **Enrichment** → Combines tweet + analysis + markets into single object
5. **Storage** → Saves to Supabase database
6. **Distribution** → Broadcasts to frontend via WebSocket + serves via REST API

---

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account (free tier works)
- Twitter API access via twitterapi.io
- Google Gemini API key

### Backend Setup

**1. Install Dependencies**
```bash
cd poly-whisper-be
npm install
```

**2. Configure Environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Server
PORT=3000
NODE_ENV=development

# Supabase (Get from https://app.supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Twitter API
WEBSOCKET_URL=wss://ws.twitterapi.io/twitter/tweet/websocket
TWITTERAPI_IO_KEY=your_twitter_api_key

# Google Gemini
GOOGLE_AI_API_KEY=your_gemini_api_key

# Frontend URLs (for CORS)
FRONTEND_DEV_URL=http://localhost:3001,http://localhost:3000
```

**3. Setup Database**
- Go to Supabase SQL Editor
- Copy content from `supabase-schema.sql`
- Execute to create tables and policies

**4. Start Server**
```bash
npm run dev
```

Server runs on `http://localhost:3000`

---

## API Reference

All API endpoints require Supabase JWT authentication.

### Base URL
```
http://localhost:3000/api/v2
```

### Authentication Header
```
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
```

---

### Endpoints

#### 1. Get Latest Tweets

**Request:**
```http
GET /api/v2/tweets/latest?count=10
```

**Response:**
```json
{
  "tweets": [
    {
      "tweetDetails": {
        "tweetId": "1234567890",
        "authorUsername": "elonmusk",
        "authorName": "Elon Musk",
        "text": "Bitcoin to the moon!",
        "createdAt": "2025-11-10T12:00:00Z",
        "likeCount": 15000,
        "retweetCount": 3000,
        "url": "https://x.com/elonmusk/status/1234567890"
      },
      "analysis": {
        "sentiment": "positive",
        "sentimentScore": 0.85,
        "keywords": ["bitcoin", "moon"],
        "categories": ["cryptocurrency"]
      },
      "polymarketMatches": [
        {
          "question": "Will Bitcoin reach $100k in 2025?",
          "probability": 0.65
        }
      ],
      "enrichedAt": "2025-11-10T12:00:05Z"
    }
  ],
  "count": 10
}
```

---

#### 2. Get Paginated Tweets

**Request:**
```http
GET /api/v2/tweets?limit=20&offset=0
```

**Query Parameters:**
- `limit` (optional, default: 10) - Number of tweets per page
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "tweets": [...],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

---

#### 3. Search Tweets

**Request:**
```http
GET /api/v2/tweets/search?q=bitcoin&limit=50
```

**Query Parameters:**
- `q` (required) - Search keyword
- `limit` (optional, default: 50) - Max results

**Response:**
```json
{
  "tweets": [...],
  "keyword": "bitcoin",
  "count": 25
}
```

---

#### 4. Get Statistics

**Request:**
```http
GET /api/v2/tweets/statistics
```

**Response:**
```json
{
  "statistics": {
    "totalTweets": 1250,
    "totalAnalyses": 1240
  },
  "timestamp": "2025-11-10T12:00:00Z"
}
```

---

#### 5. Get User Profile

**Request:**
```http
GET /api/v2/user/profile
```

**Response:**
```json
{
  "profile": {
    "id": "user-uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "created_at": "2025-11-01T10:00:00Z"
  }
}
```

---

#### 6. Create Bookmark

**Request:**
```http
POST /api/v2/user/interactions
Content-Type: application/json

{
  "tweet_id": "uuid-here",
  "interaction_type": "bookmark",
  "note": "Interesting analysis"
}
```

**Response:**
```json
{
  "interaction": {
    "id": "interaction-uuid",
    "user_id": "user-uuid",
    "tweet_id": "tweet-uuid",
    "interaction_type": "bookmark",
    "created_at": "2025-11-10T12:00:00Z"
  },
  "created": true
}
```

---

## WebSocket Integration

### Connection

**URL:**
```
ws://localhost:3000/ws?token=YOUR_SUPABASE_JWT_TOKEN
```

### Frontend Example

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function useTweetStream() {
  const [tweets, setTweets] = useState([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    async function connectWebSocket() {
      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No session found');
        return;
      }

      // Connect to WebSocket
      const websocket = new WebSocket(
        `ws://localhost:3000/ws?token=${session.access_token}`
      );

      websocket.onopen = () => {
        console.log('✅ Connected to tweet stream');
      };

      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'welcome':
            console.log('Welcome:', message.message);
            break;

          case 'newTweet':
            const tweet = message.data;
            setTweets(prev => [tweet, ...prev].slice(0, 100));
            break;

          case 'system':
            console.log('System:', message.message);
            break;
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      websocket.onclose = () => {
        console.log('❌ Disconnected from tweet stream');
      };

      setWs(websocket);

      return () => {
        websocket.close();
      };
    }

    connectWebSocket();
  }, []);

  return { tweets, ws };
}
```

### Message Types

#### From Server

**Welcome Message:**
```json
{
  "type": "welcome",
  "message": "Connected to PolySense WebSocket",
  "authType": "supabase",
  "userId": "user-uuid",
  "timestamp": "2025-11-10T12:00:00Z"
}
```

**New Tweet:**
```json
{
  "type": "newTweet",
  "data": {
    "tweetDetails": { ... },
    "analysis": { ... },
    "polymarketMatches": [ ... ],
    "enrichedAt": "..."
  },
  "timestamp": "2025-11-10T12:00:00Z"
}
```

**System Message:**
```json
{
  "type": "system",
  "level": "info",
  "message": "Twitter WebSocket connected",
  "timestamp": "2025-11-10T12:00:00Z"
}
```

#### To Server

**Ping (Heartbeat):**
```json
{
  "type": "ping"
}
```

**Subscribe to Filters:**
```json
{
  "type": "subscribe",
  "data": {
    "keywords": ["bitcoin", "ethereum"],
    "sentiment": "positive"
  }
}
```

---

## Data Format

### Enriched Tweet Structure

Every tweet (from WebSocket and REST API) has this format:

```typescript
interface EnrichedTweet {
  tweetDetails: {
    tweetId: string;
    authorId: string;
    authorUsername: string;
    authorName: string;
    userAvatar: string;
    text: string;
    createdAt: string; // ISO timestamp
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    url: string;
    ruleId: string;
    ruleTag: string;
    receivedAtMs: number;
  };
  analysis: {
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number; // -1.0 to 1.0
    keywords: string[];
    categories: string[];
    summary: string;
  };
  polymarketMatches: Array<{
    question: string;
    slug: string;
    volume: number;
    probability: number;
    [key: string]: any;
  }>;
  enrichedAt: string; // ISO timestamp
}
```

---

## Authentication

### Supabase Auth Flow

**1. Sign Up**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword'
});
```

**2. Sign In**
```typescript
const { data: { session }, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});

const token = session.access_token; // JWT token
```

**3. Use Token in API Calls**
```typescript
fetch('http://localhost:3000/api/v2/tweets/latest', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**4. Use Token in WebSocket**
```typescript
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
```

### Token Management

- Tokens expire after 1 hour
- Refresh automatically with Supabase client
- Check session before API calls:

```typescript
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  // Redirect to login
}
```

---

## Environment Setup

### Frontend Environment Variables

Create `.env.local` in your frontend project:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### Backend Environment Variables

See `.env.example` for complete configuration.

**Required:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Secret service role key
- `GOOGLE_AI_API_KEY` - Google Gemini API key
- `TWITTERAPI_IO_KEY` - Twitter API key

---

## Complete Frontend Integration Example

```typescript
// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial tweets
  useEffect(() => {
    async function fetchTweets() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch(
        'http://localhost:3000/api/v2/tweets/latest?count=20',
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();
      setTweets(data.tweets);
      setLoading(false);
    }

    fetchTweets();
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    async function connectWebSocket() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const ws = new WebSocket(
        `ws://localhost:3000/ws?token=${session.access_token}`
      );

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'newTweet') {
          setTweets(prev => [message.data, ...prev].slice(0, 50));
        }
      };

      return () => ws.close();
    }

    connectWebSocket();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Live Tweets</h1>
      {tweets.map(tweet => (
        <div key={tweet.tweetDetails.tweetId}>
          <h3>{tweet.tweetDetails.authorName}</h3>
          <p>{tweet.tweetDetails.text}</p>
          <span>Sentiment: {tweet.analysis.sentiment}</span>
          <div>
            {tweet.analysis.keywords.map(kw => (
              <span key={kw}>{kw}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Testing

### Get Test JWT Token

```bash
# Sign up a test user
curl -X POST "https://your-project.supabase.co/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Login to get token
curl -X POST "https://your-project.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Response contains access_token - use it in API calls
```

### Test API Endpoint

```bash
TOKEN="your_jwt_token_here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v2/tweets/latest?count=5
```

---

## Troubleshooting

### "Invalid API key" Error

**Fix:** Update `SUPABASE_SERVICE_ROLE_KEY` in `.env` with correct key from Supabase dashboard.

### "Unauthorized" Error

**Check:**
1. JWT token is valid (not expired)
2. Token is correctly passed in `Authorization: Bearer <token>` header
3. User exists in Supabase auth

### WebSocket Connection Fails

**Check:**
1. Token is passed in URL: `ws://localhost:3000/ws?token=YOUR_TOKEN`
2. Token is valid
3. Backend is running

### No Tweets Appearing

**Check:**
1. Twitter WebSocket is connected (check backend logs)
2. Tweets are being received (check backend logs for "ENRICHED TWEET")
3. Database is configured correctly

---

## Support

- **Documentation:** See `SETUP_GUIDE.md` for detailed setup
- **Database Schema:** See `supabase-schema.sql`
- **Issues:** Create an issue on GitHub

---

## License

ISC License - See LICENSE file for details

---

**Built with:** Node.js • Express • Supabase • WebSocket • Google Gemini AI • Polymarket API
