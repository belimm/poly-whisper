/**
 * Tweet Analyzer (TypeScript)
 * Analyzes tweets using LLM for market-relevant keywords and sentiment
 */

import { OpenAIClient } from '../infrastructure/client/llmClient';
import { filterStopwords } from '../utils/stopwords';
import type { TweetAnalysis } from '../types';

interface TweetAnalyzerOptions {
   llmOptions?: unknown;
}

export class TweetAnalyzer {
   private knownKeywords: Set<string>;
   private llmClient: OpenAIClient | null;

   constructor(options: TweetAnalyzerOptions = {}) {
      this.knownKeywords = new Set([
         'gold',
         'silver',
         'bitcoin',
         'btc',
         'ethereum',
         'eth',
         'messi',
         'injury',
         'tesla',
         'elon',
         'stock',
         'usd',
         'dollar',
      ]);

      // Initialize LLM client if API key is available
      this.llmClient = null;
      if (process.env.OPENAI_API_KEY) {
         try {
            this.llmClient = new OpenAIClient(options.llmOptions || {});
            console.log('✅ LLM client initialized successfully');
         } catch (error: any) {
            console.error(
               '❌ LLM client initialization failed:',
               error.message
            );
         }
      } else {
         console.warn(
            '⚠️  LLM API key not found. Set OPENAI_API_KEY to enable LLM-based analysis'
         );
      }
   }

   /**
    * Synchronous lightweight analyzer that returns keywords + categories
    */
   analyzeTweet(text = ''): TweetAnalysis {
      // Clean retweet prefix if present
      const cleanText = this._cleanRetweetText(String(text));
      const lower = cleanText.toLowerCase();
      const keywords: string[] = [];
      const categories = new Set<string>();

      for (const kw of this.knownKeywords) {
         if (lower.includes(kw)) {
            keywords.push(kw);
            if (['gold', 'silver'].includes(kw)) categories.add('commodity');
            if (['bitcoin', 'btc', 'ethereum', 'eth'].includes(kw))
               categories.add('crypto');
         }
      }

      // If none matched, try extracting proper nouns / capitalized tokens as hints
      if (keywords.length === 0) {
         const caps = (cleanText.match(/([A-Z][a-zA-Z]{2,})/g) || []).slice(
            0,
            3
         );
         for (const c of caps) {
            const token = c.toLowerCase();
            keywords.push(token);
         }
      }

      // Apply stopwords filter to remove irrelevant keywords
      const filteredKeywords = filterStopwords(keywords);

      return {
         sentiment: 'neutral',
         sentiment_score: 0.5,
         keywords: Array.from(new Set(filteredKeywords)),
         categories: Array.from(categories),
      };
   }

   /**
    * Enhanced analysis using LLM for better entity extraction and market insights
    */
   async analyzeWithLLM(
      text: string,
      llmClient?: OpenAIClient
   ): Promise<TweetAnalysis> {
      const client = llmClient || this.llmClient;

      if (!client) {
         console.warn(
            'No LLM client available, falling back to heuristic analysis'
         );
         return this.analyzeTweet(text);
      }

      try {
         // Clean retweet text before LLM analysis
         const cleanText = this._cleanRetweetText(String(text));

         // Get LLM analysis
         const llmResult = await client.analyzeTweet(cleanText);

         // Combine LLM results with heuristic analysis for better coverage
         const heuristicResult = this.analyzeTweet(text);

         // Merge and deduplicate keywords
         const allKeywords = [
            ...heuristicResult.keywords,
            ...(llmResult.betting_keywords || []),
            ...(llmResult.financial_instruments || []),
            ...(llmResult.key_entities || []).map((e: string) => e.toLowerCase()),
         ];

         // Apply stopwords filter to remove irrelevant keywords
         const filteredKeywords = filterStopwords(allKeywords);

         const allCategories = [
            ...heuristicResult.categories,
            ...(llmResult.categories || []),
         ];

         return {
            sentiment:
               (llmResult.sentiment as 'positive' | 'negative' | 'neutral') ||
               'neutral',
            sentiment_score: llmResult.sentiment_score || 0.5,
            keywords: Array.from(new Set(filteredKeywords)).slice(0, 10), // limit to 10 most relevant
            categories: Array.from(new Set(allCategories)),
            summary: llmResult.summary,
            confidence: llmResult.confidence,
            reasoning: llmResult.reasoning,
            financial_instruments: llmResult.financial_instruments,
            key_entities: llmResult.key_entities,
            market_events: llmResult.market_events,
            betting_keywords: llmResult.betting_keywords,
         };
      } catch (error: any) {
         console.error(
            'LLM analysis failed, falling back to heuristics:',
            error.message
         );

         // Return heuristic analysis with error info
         const fallback = this.analyzeTweet(text);
         return {
            ...fallback,
            summary: 'LLM analysis failed, using heuristic fallback',
            confidence: 0.1,
         };
      }
   }

   /**
    * Helper method to clean retweet prefix
    */
   private _cleanRetweetText(text: string): string {
      const cleanText = String(text).trim();
      // Match "RT @username: " pattern and remove it
      const retweetMatch = cleanText.match(/^RT @\w+:\s*(.*)/is);
      return retweetMatch ? retweetMatch[1].trim() : cleanText;
   }
}

export default TweetAnalyzer;
