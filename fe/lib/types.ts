export interface MarketMatch {
   market: {
      id: string;
      [key: string]: unknown;
   };
   relevance_score: number;
   reasoning: string;
   keyword?: string;
}

export interface EnrichedTweet {
   tweetDetails: {
      tweetId: string;
      authorId: string;
      authorUsername: string;
      authorName: string;
      authorAvatarURL: string;
      text: string;
      createdAt: string;
      likeCount: number;
      retweetCount: number;
      replyCount: number;
      url: string;
      receivedAtMs: number;
   };
   analysis: {
      sentiment: 'positive' | 'negative' | 'neutral';
      sentiment_score: number;
      keywords: string[];
      categories: string[];
      summary: string;
   };
   enrichedAt: string;
   markets?: MarketMatch[];
}

export interface MarketTag {
   id: string;
   label: string;
   slug: string;
}

export interface Market {
   id: string;
   question: string;
   slug: string;
   volume_num: number;
   liquidity: number;
   volume_24hr: number;
   volume_1wk: number;
   volume_1mo: number;
   one_day_price_change: number;
   one_week_price_change: number;
   one_month_price_change: number;
   outcomes: string; // JSON string e.g., '["Yes","No"]'
   outcome_prices: string; // JSON string e.g., '["0.99","0.01"]'
   active: boolean;
   closed: boolean;
   archived: boolean;
   end_date: string | null;
   start_date: string | null;
   tags: MarketTag[];
   category: string;
   market_data: {
      events?: Array<{
         id: string;
         ticker?: string;
         slug: string;
         title: string;
         description?: string;
         resolutionSource?: string;
         startDate?: string;
         creationDate?: string;
         endDate?: string;
         image?: string;
         icon?: string;
         active?: boolean;
         closed?: boolean;
         archived?: boolean;
         [key: string]: unknown;
      }>;
      conditionId?: string;
      questionID?: string;
      resolutionSource?: string;
      description?: string;
      image?: string;
      icon?: string;
      [key: string]: unknown;
   };
   refreshed_at: string;
   created_at: string;
   updated_at: string;

   // Computed/backward compatibility fields
   probability?: number; // Calculated from outcome_prices[0]
   volume?: number; // Alias for volume_num
   bestBid?: number;
   bestAsk?: number;
   lastTradePrice?: number;
   updatedAt?: string;
}

// Helper function to parse outcome prices and get probability
export function getMarketProbability(market: Market): number {
   try {
      const prices = JSON.parse(market.outcome_prices) as string[];
      return parseFloat(prices[0] || '0');
   } catch {
      return market.probability || 0;
   }
}

// Helper function to get volume
export function getMarketVolume(market: Market): number {
   return market.volume || market.volume_num;
}

export interface MarketsResponse {
   success: boolean;
   tweetId: string;
   keywords: string[];
   markets: Market[];
   marketCount: number;
   marketsByKeyword: {
      [keyword: string]: Market[];
   };
   message?: string;
}

export interface TweetsResponse {
   tweets: EnrichedTweet[];
   total: number;
   limit: number;
   offset: number;
   hasMore: boolean;
   user: {
      id: string;
      email: string;
   };
}

export interface TweetStatistics {
   total: number;
   withAnalysis: number;
   timestamp: string;
}

