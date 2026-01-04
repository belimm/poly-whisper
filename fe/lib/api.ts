import type { TweetsResponse, TweetStatistics, Market } from './types';

class PolyWhisperAPI {
   private readonly baseURL: string;
   private readonly websocketURL: string;

   constructor() {
      console.log('Environment:', process.env);

      // Use production URLs by default, unless explicitly running in local development
      const isLocalDevelopment = process.env.NEXT_PUBLIC_USE_LOCAL === 'true' ||
                                  (process.env.NODE_ENV === 'development');


      this.baseURL = isLocalDevelopment
         ? process.env.NEXT_PUBLIC_LOCAL_API_URL || ''
         : process.env.NEXT_PUBLIC_API_URL || '';

      console.log('Using baseURL:', this.baseURL);

      this.websocketURL = isLocalDevelopment
         ? process.env.NEXT_PUBLIC_LOCAL_WS_URL || ''
         : process.env.NEXT_PUBLIC_WS_URL || '';

      console.log('Using websocketURL:', this.websocketURL);
   }

   /**
    * Get the WebSocket URL for real-time connections
    */
   getWebSocketURL(): string {
      return this.websocketURL;
   }

   /**
    * Fetch tweets with AI analysis
    */
   async getTweetsWithAnalysis(
      limit = 20,
      offset = 0
   ): Promise<TweetsResponse> {
      const response = await fetch(
         `${this.baseURL}/api/tweets/with-analysis?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
         if (response.status === 401) {
            throw new Error('Authentication failed');
         }
         throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched tweets:', data);
      return data;
   }

   /**
    * Get tweet statistics (total tweets, analyzed tweets, etc.)
    */
   async getTweetStatistics(): Promise<TweetStatistics> {
      const response = await fetch(`${this.baseURL}/api/tweets/statistics`);

      if (!response.ok) {
         throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
   }

   /**
    * Get detailed market information by market IDs
    */
   async getMarketDetails(marketIds: string[]): Promise<{
      markets: Market[];
      found: number;
      requested: number;
      notFound: string[];
      timestamp: string;
      lastRefreshTime: string;
   }> {
      const response = await fetch(`${this.baseURL}/api/markets/details`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({ ids: marketIds }),
      });

      if (!response.ok) {
         if (response.status === 400) {
            throw new Error('Invalid market IDs');
         }
         if (response.status === 503) {
            throw new Error('Market catalog service unavailable');
         }
         throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
   }
}

export const api = new PolyWhisperAPI();
