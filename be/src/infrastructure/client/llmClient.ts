/**
 * LLM clients for tweet analysis and market matching
 * Supports: OpenAI (GPT-4 mini)
 */

import OpenAI from 'openai';
import type {
   TweetAnalysis,
   MatchingResult,
   CompactMarket,
   Logger,
} from '../../types/index.js';

interface OpenAIClientOptions {
   apiKey?: string;
   model?: string;
   maxRetries?: number;
   retryDelay?: number;
}

/**
 * OpenAI Client (GPT-4 mini)
 * Optimized for intelligent market matching with catalog
 */
export class OpenAIClient {
   private apiKey: string;
   private model: string;
   private maxRetries: number;
   private retryDelay: number;
   private openai: OpenAI;

   constructor(options: OpenAIClientOptions = {}) {
      this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
      this.model = options.model || 'gpt-4o-mini'; // GPT-4o mini is the latest fast model
      this.maxRetries = options.maxRetries || 3;
      this.retryDelay = options.retryDelay || 1000;

      if (!this.apiKey) {
         throw new Error(
            'OpenAI API key is required. Set OPENAI_API_KEY environment variable.'
         );
      }

      // Initialize OpenAI client
      this.openai = new OpenAI({
         apiKey: this.apiKey,
      });
   }

   /**
    * Match tweet to relevant markets from catalog
    * Uses GPT-4 mini to intelligently understand tweet context and find best matches
    */
   async matchTweetToMarkets(
      tweetText: string,
      marketCatalog: CompactMarket[],
      maxMatches = 5
   ): Promise<MatchingResult> {
      // Build a compact catalog for the prompt (to reduce tokens)
      const compactCatalog = marketCatalog.slice(0, 200).map((m, idx) => ({
         idx, // Index for reference
         q: m.question, // Question
         c: m.category, // Category
         t: m.tags || [], // Tags
         v: Math.round(m.volume || 0), // Volume
      }));

      const prompt = `You are an expert at matching tweets to prediction markets on Polymarket.

TWEET:
"${tweetText}"

AVAILABLE MARKETS (top 200 by volume):
${JSON.stringify(compactCatalog, null, 2)}

TASK:
Analyze the tweet and find the ${maxMatches} MOST RELEVANT markets from the catalog above.

MATCHING CRITERIA:
1. **Semantic relevance**: Does the market question relate to the tweet topic?
2. **Entity overlap**: Does the tweet mention entities/topics in the market?
3. **Context understanding**: Consider implicit meanings, not just keywords
4. **Recency**: Prefer markets that are timely and active

SCORING:
- 0.9-1.0: Perfect match, tweet directly discusses this market
- 0.7-0.9: Strong match, tweet is highly relevant to market topic
- 0.5-0.7: Moderate match, some relevance but not direct
- Below 0.5: Weak match, only tangential relevance

OUTPUT FORMAT (JSON only):
{
  "matches": [
    {
      "market_idx": 5,
      "relevance_score": 0.95,
      "reasoning": "Brief explanation why this matches"
    }
  ],
  "tweet_summary": "One sentence summary of tweet topic",
  "confidence": 0.85
}

Return ONLY the top ${maxMatches} matches, sorted by relevance_score (highest first).
If no markets are relevant (all below 0.5), return empty matches array.

RESPOND WITH VALID JSON ONLY:`;

      try {
         const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
               {
                  role: 'system',
                  content:
                     'You are an expert at matching tweets to prediction markets. Always respond with valid JSON.',
               },
               {
                  role: 'user',
                  content: prompt,
               },
            ],
            temperature: 0.2, // Low temperature for consistent results
            max_tokens: 1000,
            response_format: { type: 'json_object' }, // Force JSON response
         });

         const content = response.choices[0]?.message?.content;
         if (!content) {
            throw new Error('No content in OpenAI response');
         }

         const result = JSON.parse(content) as {
            matches: Array<{
               market_idx: number;
               relevance_score: number;
               reasoning: string;
            }>;
            tweet_summary: string;
            confidence: number;
         };

         // Map indices back to full market objects
         const matchedMarkets = (result.matches || []).map((match) => ({
            market: marketCatalog[match.market_idx],
            relevance_score: match.relevance_score,
            reasoning: match.reasoning,
         }));

         return {
            success: true,
            matches: matchedMarkets as any,
            tweet_summary: result.tweet_summary,
            confidence: result.confidence,
            source: 'intelligent-gpt4-mini',
         };
      } catch (error) {
         console.error(
            'OpenAI market matching failed:',
            (error as Error).message
         );
         return {
            success: false,
            matches: [],
            tweet_summary: 'Analysis failed',
            confidence: 0,
            error: (error as Error).message,
            source: 'intelligent-gpt4-mini',
         };
      }
   }

   /**
    * Analyze tweet (compatible with GoogleAIClient interface)
    * This is for backwards compatibility
    */
   async analyzeTweet(tweetText: string): Promise<TweetAnalysis> {
      const prompt = `Analyze this tweet for Polymarket relevance:

"${tweetText}"

Extract:
- Financial instruments (tickers, crypto, stocks)
- Key entities (people, companies, countries)
- Market events (elections, earnings, launches, etc.)
- Betting keywords (searchable phrases)
- Sentiment and confidence

Respond with JSON only:
{
  "financial_instruments": ["BTC", "TSLA"],
  "key_entities": ["Elon Musk"],
  "market_events": ["Tesla earnings Q4"],
  "betting_keywords": ["Tesla stock price", "Bitcoin above 100k"],
  "sentiment": "positive",
  "sentiment_score": 0.8,
  "categories": ["finance", "tech"],
  "summary": "Brief summary",
  "confidence": 0.9,
  "reasoning": "Why this is relevant"
}`;

      try {
         const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
               {
                  role: 'system',
                  content:
                     'You are an expert at analyzing tweets for prediction market relevance. Always respond with valid JSON.',
               },
               {
                  role: 'user',
                  content: prompt,
               },
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: 'json_object' },
         });

         const content = response.choices[0]?.message?.content;
         if (!content) {
            throw new Error('No content in OpenAI response');
         }

         return JSON.parse(content) as TweetAnalysis;
      } catch (error) {
         console.error(
            'OpenAI tweet analysis failed:',
            (error as Error).message
         );
         return {
            sentiment: 'neutral',
            sentiment_score: 0.5,
            keywords: [],
            categories: [],
            summary: 'Analysis failed',
            confidence: 0,
            reasoning: `OpenAI analysis failed: ${(error as Error).message}`,
         };
      }
   }
}

export default OpenAIClient;
