/**
 * Global type definitions for Node.js
 */

declare global {
   namespace NodeJS {
      interface ProcessEnv {
         NODE_ENV?: string;
         PORT?: string;
         SUPABASE_URL?: string;
         SUPABASE_SERVICE_ROLE_KEY?: string;
         SUPABASE_ANON_KEY?: string;
         OPENAI_API_KEY?: string;
         TWITTERAPI_IO_KEY?: string;
         MARKET_CATALOG_REFRESH_INTERVAL?: string;
         MARKET_CATALOG_MIN_VOLUME?: string;
         MARKET_CATALOG_MIN_LIQUIDITY?: string;
         MAX_MARKETS_PER_TWEET?: string;
         MIN_RELEVANCE_SCORE?: string;
         MAX_MARKETS_PER_KEYWORD?: string;
         FRONTEND_DEV_URL?: string;
         FRONTEND_PROD_URL?: string;
         DEV_DOMAIN?: string;
         PROD_DOMAIN?: string;
         npm_package_version?: string;
      }
   }

   var process: NodeJS.Process;
   var console: Console;
}

export {};
