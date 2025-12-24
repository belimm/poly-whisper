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
      sentimentScore: number;
      keywords: string[];
      categories: string[];
      summary: string;
   };
   enrichedAt: string;
}

export interface Market {
   id: string;
   question: string;
   slug: string;
   probability: number;
   volume: number;
   liquidity: number;
   bestBid: number;
   bestAsk: number;
   lastTradePrice: number;
   updatedAt: string;
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

