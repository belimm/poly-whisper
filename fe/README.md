# Poly-Whisper Frontend

Real-time Twitter monitoring with AI analysis and Polymarket correlation - Frontend Application.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Supabase
- **API Communication:** REST API + WebSocket (planned)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ryuihsruolyygfsunqod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API URLs
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**For Production:**
```env
NEXT_PUBLIC_API_URL=https://poly-whisper.onrender.com
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
fe/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard
│   ├── Header.tsx         # Header component
│   ├── TheWire.tsx        # Tweet feed (uses API)
│   ├── TrendingMarkets.tsx
│   ├── HotMarkets.tsx
│   └── IntelAnalysis.tsx
├── hooks/                 # Custom React hooks
│   ├── useTweets.ts       # Fetch tweets
│   └── useFindMarkets.ts  # Find markets
├── lib/                   # Utilities
│   ├── supabase.ts        # Supabase client
│   ├── api.ts             # API client
│   └── types.ts           # TypeScript types
└── public/                # Static assets
```

## Main Features

### Dashboard Layout

The dashboard is divided into 4 columns (responsive):

1. **The Wire** - Real-time tweet feed with AI analysis
2. **Trending Markets** - Popular prediction markets
3. **Hot Markets** - Volatile markets with rapid changes
4. **Intel & Analysis** - AI-powered predictions

### API Integration

The frontend uses two main endpoints:

#### 1. Get Tweets with Analysis
```typescript
GET /api/tweets/with-analysis?limit=20&offset=0
```
Fetches tweets with sentiment analysis, keywords, and categories.

#### 2. Find Markets for Tweet
```typescript
GET /api/tweets/:tweetId/findMarkets
```
Finds related Polymarket markets based on tweet keywords.

### Authentication

Uses Supabase authentication:

```typescript
import { supabase } from '@/lib/supabase'

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get session
const { data: { session } } = await supabase.auth.getSession()
```

## Components

### TheWire Component

Displays tweets with AI analysis. Features:
- Sentiment badges (Bullish/Bearish/Neutral)
- Time ago formatting
- Avatar display
- Market keyword links
- Load more functionality

**Usage:**
```typescript
import TheWire from '@/components/TheWire'

<TheWire />
```

### Custom Hooks

#### useTweets

Fetch and manage tweets:

```typescript
const { tweets, loading, error, hasMore, loadMore } = useTweets({
  limit: 20,
  autoFetch: true
})
```

#### useFindMarkets

Find markets for a specific tweet:

```typescript
const { findMarkets, loading, error } = useFindMarkets()

const markets = await findMarkets(tweetId)
```

## Responsive Design

The dashboard is fully responsive:
- **Mobile:** 1 column (stacked)
- **Tablet:** 2 columns
- **Desktop:** 4 columns

Breakpoints:
- `md`: 768px (2 columns)
- `xl`: 1280px (4 columns)

## Styling

Uses Tailwind CSS with custom dark mode colors:

```css
colors: {
  primary: '#137fec',
  background-light: '#f6f7f8',
  background-dark: '#101922',
  surface-dark: '#19232e',
  border-dark: '#2a3745',
}
```

Material Symbols icons are used throughout the app:

```html
<span className="material-symbols-outlined">trending_up</span>
```

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Development Checklist

- [x] Project setup with Next.js 14
- [x] Tailwind CSS configuration
- [x] Supabase client setup
- [x] TypeScript types
- [x] API client utility
- [x] Custom hooks (useTweets, useFindMarkets)
- [x] Header component
- [x] Dashboard layout
- [x] TheWire component (with API integration)
- [x] TrendingMarkets component
- [x] HotMarkets component
- [x] IntelAnalysis component
- [x] Responsive design
- [ ] Authentication flow
- [ ] WebSocket integration for real-time updates
- [ ] Market detail pages
- [ ] User profile pages
- [ ] Error boundary components
- [ ] Loading states
- [ ] Toast notifications

## Next Steps

1. **Add Authentication UI**
   - Login/Signup pages
   - Protected routes
   - Session management

2. **WebSocket Integration**
   - Real-time tweet updates
   - Market price updates
   - System notifications

3. **Enhanced Features**
   - Search functionality
   - Filters and sorting
   - Bookmarks and favorites
   - User interactions

4. **Performance Optimization**
   - Image optimization
   - Code splitting
   - Caching strategies

## Troubleshooting

### "Module not found" errors

Run:
```bash
npm install
```

### Tailwind classes not applying

Make sure `tailwind.config.ts` includes all component paths.

### API connection errors

1. Check `.env.local` configuration
2. Verify backend is running on correct port
3. Check CORS settings in backend

## License

ISC License

