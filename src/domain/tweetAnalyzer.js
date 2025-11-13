// src/services/tweetAnalyzer.js
// Lightweight tweet analyzer: heuristics for extracting keywords and categories.
// Now includes LLM-based analysis using Google AI Studio.

import GoogleAIClient from '../infrastructure/client/llmClient.js';

export default class TweetAnalyzer {
   constructor(options = {}) {
      this.options = options;
      // small known keywords list — extend as you need
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
      if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
         try {
            this.llmClient = new GoogleAIClient(options.llmOptions || {});
            console.log('✅ LLM client initialized successfully');
         } catch (error) {
            console.error('❌ LLM client initialization failed:', error.message);
            console.error('Stack:', error.stack);
         }
      } else {
         console.warn('⚠️  LLM API keys not found in environment variables. Set GEMINI_API_KEY or GOOGLE_AI_API_KEY to enable LLM-based analysis');
      }
   }

   // Synchronous lightweight analyzer that returns keywords + categories
   analyzeTweet(text = '') {
      // Clean retweet prefix if present
      const cleanText = this._cleanRetweetText(String(text));
      const lower = cleanText.toLowerCase();
      const keywords = [];
      const categories = new Set();

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

      return {
         text: cleanText,
         originalText: String(text),
         keywords: Array.from(new Set(keywords)),
         categories: Array.from(categories),
         isRetweet: this._isRetweet(String(text)),
         analyzedAt: new Date().toISOString(),
      };
   }

   // Enhanced analysis using LLM for better entity extraction and market insights
   async analyzeWithLLM(text, llmClient = null) {
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
            ...(llmResult.key_entities || []).map((e) => e.toLowerCase()),
         ];

         const allCategories = [
            ...heuristicResult.categories,
            ...(llmResult.categories || []),
         ];

         return {
            text: cleanText,
            originalText: String(text),
            keywords: Array.from(new Set(allKeywords)).slice(0, 10), // limit to 10 most relevant
            categories: Array.from(new Set(allCategories)),
            sentiment: llmResult.sentiment || 'neutral',
            confidence: llmResult.confidence || 0.5,
            entities: {
               financial_instruments: llmResult.financial_instruments || [],
               key_entities: llmResult.key_entities || [],
               market_events: llmResult.market_events || [],
            },
            reasoning: llmResult.reasoning || 'LLM analysis completed',
            isRetweet: this._isRetweet(String(text)),
            analyzedAt: new Date().toISOString(),
            source: 'llm+heuristic',
         };
      } catch (error) {
         console.error(
            'LLM analysis failed, falling back to heuristics:',
            error.message
         );

         // Return heuristic analysis with error info
         const fallback = this.analyzeTweet(text);
         return {
            ...fallback,
            sentiment: 'neutral',
            confidence: 0.1,
            error: error.message,
            source: 'heuristic-fallback',
         };
      }
   }

   // Helper method to detect retweets
   _isRetweet(text) {
      return /^RT @\w+:/i.test(String(text).trim());
   }

   // Helper method to clean retweet prefix
   _cleanRetweetText(text) {
      const cleanText = String(text).trim();
      // Match "RT @username: " pattern and remove it (using 's' flag to match newlines)
      const retweetMatch = cleanText.match(/^RT @\w+:\s*(.*)/is);
      return retweetMatch ? retweetMatch[1].trim() : cleanText;
   }
}
