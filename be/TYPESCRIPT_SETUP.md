# TypeScript Setup Guide

## Overview

The backend has been converted to TypeScript with strict typing. All files use TypeScript with comprehensive type definitions.

## Project Structure

```
be-new/
├── src/
│   ├── types/
│   │   └── index.ts              # All type definitions
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── supabaseClient.ts
│   │   └── websocket/
│   │       ├── twitterWebSocket.ts
│   │       └── clientWebSocket.ts
│   ├── services/
│   │   └── market/
│   │       ├── marketCatalogService.js  # TODO: Convert to TS
│   │       ├── intelligentMarketMatcher.js  # TODO: Convert to TS
│   │       └── marketMatchingService.js  # TODO: Convert to TS
│   ├── routes/
│   │   ├── tweetRoutes.ts
│   │   ├── userRoutes.ts
│   │   └── marketRoutes.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── urlBuilder.ts
│   │   └── util.ts
│   ├── app.ts                   # Express app setup
│   └── index.ts                 # Main entry point
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

## Installation

```bash
cd be-new
npm install
```

## Development

### Run in Development Mode (with auto-reload)

```bash
npm run dev
```

This uses `tsx watch` to automatically recompile and restart on file changes.

### Build for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### Run Production Build

```bash
npm start
```

### Type Checking

```bash
npm run type-check
```

## TypeScript Configuration

The project uses **strict mode** with the following key settings:

- `strict: true` - Enables all strict type checking options
- `noUnusedLocals: true` - Error on unused local variables
- `noUnusedParameters: true` - Error on unused parameters
- `noImplicitReturns: true` - Error on functions without return statements
- `noFallthroughCasesInSwitch: true` - Error on fallthrough cases

## Type Definitions

All types are defined in `src/types/index.ts`:

- **Database Types**: `MarketCatalogRow`, `MarketTag`
- **API Types**: `PolymarketMarket`, `TweetDetails`, `TweetAnalysis`
- **WebSocket Types**: `TwitterWebSocketMessage`, `ClientWebSocketMessage`
- **Service Types**: `MarketCatalogService`, `IntelligentMarketMatcher`
- **Express Types**: `AppLocals`

## Converting Remaining Files

The following files still need to be converted from JavaScript to TypeScript:

1. `src/services/market/marketCatalogService.js` → `.ts`
2. `src/services/market/intelligentMarketMatcher.js` → `.ts`
3. `src/services/market/marketMatchingService.js` → `.ts`
4. `src/infrastructure/client/llmClient.js` → `.ts`
5. `src/domain/tweetAnalyzer.js` → `.ts`
6. `src/services/application/tweetPipeline.js` → `.ts`
7. `src/services/database/tweetDatabaseService.js` → `.ts`
8. `src/services/application/tweetProcessingQueue.js` → `.ts`

## Best Practices

### 1. Always Use Types

```typescript
// ✅ Good
function processTweet(tweet: TweetDetails): EnrichedTweet {
  // ...
}

// ❌ Bad
function processTweet(tweet: any) {
  // ...
}
```

### 2. Use Interfaces for Object Shapes

```typescript
// ✅ Good
interface MarketMatch {
  market: MarketCatalogRow;
  relevance_score: number;
  reasoning: string;
}

// ❌ Bad
const match: any = { ... };
```

### 3. Handle Null/Undefined Explicitly

```typescript
// ✅ Good
const market = marketCatalogService.getMarketById(id);
if (!market) {
  throw new Error('Market not found');
}

// ❌ Bad
const market = marketCatalogService.getMarketById(id);
market.question; // Could be null
```

### 4. Use Type Guards

```typescript
function isEnrichedTweet(obj: unknown): obj is EnrichedTweet {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'tweetDetails' in obj &&
    'analysis' in obj
  );
}
```

## Environment Variables

Required environment variables:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# OpenAI (for intelligent matching)
OPENAI_API_KEY=sk-...

# Twitter API
TWITTERAPI_IO_KEY=your_twitter_api_key

# Optional Configuration
MARKET_CATALOG_REFRESH_INTERVAL=300000  # 5 minutes
MARKET_CATALOG_MIN_VOLUME=10000
MAX_MARKETS_PER_TWEET=5
MIN_RELEVANCE_SCORE=0.5
```

## Troubleshooting

### Type Errors

If you see type errors:

1. Run `npm run type-check` to see all errors
2. Check `src/types/index.ts` for missing type definitions
3. Use `as` type assertions sparingly (only when necessary)

### Import Errors

TypeScript uses ES modules. Make sure:

1. All imports use `.js` extension (TypeScript requirement)
2. `package.json` has `"type": "module"`
3. `tsconfig.json` has `"module": "ESNext"`

### Build Errors

If build fails:

1. Check `tsconfig.json` configuration
2. Ensure all dependencies are installed
3. Run `npm run type-check` to see specific errors

## Next Steps

1. Convert remaining JavaScript files to TypeScript
2. Add unit tests with TypeScript
3. Set up ESLint for TypeScript
4. Add pre-commit hooks for type checking

