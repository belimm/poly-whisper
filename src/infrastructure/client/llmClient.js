// src/services/llmClient.js
// Google AI Studio (Gemini) client for tweet analysis using official SDK

import { GoogleGenAI } from '@google/genai';

class GoogleAIClient {
   constructor(options = {}) {
      this.apiKey =
         options.apiKey ||
         process.env.GEMINI_API_KEY ||
         process.env.GOOGLE_AI_API_KEY;
      this.model = options.model || 'gemini-2.5-flash';
      this.maxRetries = options.maxRetries || 3;
      this.retryDelay = options.retryDelay || 1000;

      if (!this.apiKey) {
         throw new Error(
            'Google AI API key is required. Set GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable.'
         );
      }

      // Initialize the Google GenAI client
      this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
   }

   async generateContent(prompt, options = {}) {
      let lastError;

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
         try {
            const response = await this.genAI.models.generateContent({
               model: this.model,
               contents: prompt,
               generationConfig: {
                  temperature: options.temperature || 0.1,
                  topK: options.topK || 40,
                  topP: options.topP || 0.95,
                  maxOutputTokens: options.maxOutputTokens || 1024,
               },
            });

            return response.text;
         } catch (error) {
            lastError = error;
            console.warn(
               `Google AI request attempt ${attempt} failed:`,
               error.message
            );

            if (attempt < this.maxRetries) {
               await new Promise((resolve) =>
                  setTimeout(resolve, this.retryDelay * attempt)
               );
            }
         }
      }

      throw new Error(
         `Google AI request failed after ${this.maxRetries} attempts: ${lastError.message}`
      );
   }

   // Specialized method for tweet analysis
   async analyzeTweet(tweetText) {
      const prompt = `
  Analyze this tweet to extract ONLY high-relevance prediction market opportunities on Polymarkets.

  **CRITICAL FILTERING RULES - STRICT REJECTION OF IRRELEVANT WORDS:**

  ❌ REJECT THESE CATEGORIES COMPLETELY:
  1. PRONOUNS: "this", "that", "these", "those", "you", "he", "she", "it", "we", "they", "what", "which", "who", "that"
  2. GENERIC ADJECTIVES: "new", "cool", "long", "true", "good", "bad", "big", "small", "first", "last", "right", "best", "worst"
  3. GENERIC VERBS: "is", "are", "was", "were", "have", "has", "get", "make", "go", "come", "happen", "work", "be", "do", "working"
  4. COMMON ADVERBS: "very", "just", "really", "totally", "never", "always", "just", "only", "more", "most"
  5. FILLER WORDS: "like", "oh", "wow", "cool", "awesome", "amazing", "nice", "lol", "omg"
  6. GENERIC NOUNS: "thing", "stuff", "way", "time", "place", "part", "level"
  7. SINGLE LETTERS & NUMBERS: "a", "b", "x", "y", or single digit numbers
  8. HASHTAGS AS STANDALONE: Only extract if part of a meaningful phrase

  ✅ ONLY EXTRACT THESE:
  - **Financial Instruments**: Ticker symbols (BTC, TSLA, AAPL) or full names (Bitcoin, Apple, Tesla)
  - **Key Entities**: Specific proper nouns only (Elon Musk, JPMorgan, USA, UK) - NO generic nouns
  - **Market Events**: Concrete, datable events (2024 election, Q4 earnings, FDA approval, World Cup)
  - **Betting Keywords**: 2-4 word searchable phrases that directly match Polymarket listings
    * GOOD: "Tesla stock price", "Bitcoin above 100k", "Trump 2024 election winner"
    * BAD: "try", "working", "cool", "you", "this", "never", "really", "totally", "kind", "always"

  **CONFIDENCE THRESHOLD:**
  - 0.9-1.0: Clear market topic with specific named entities/events
  - 0.6-0.9: Related but may need clarification
  - Below 0.6: EXCLUDE from results entirely

  **Categories Rule:**
  - Maximum 2 categories, ordered by relevance
  - Do NOT include generic categories without specific evidence

  Tweet: "${tweetText}"

  Respond ONLY with valid JSON. OMIT empty arrays. Only include fields with actual data:
  {
    "financial_instruments": ["BTC", "TSLA"],
    "key_entities": ["Elon Musk", "Apple"],
    "market_events": ["Tesla earnings Q4 2025"],
    "betting_keywords": ["Tesla stock price above 300", "Bitcoin above 100k"],
    "sentiment": "positive",
    "sentiment_score": 0.85,
    "categories": ["finance", "tech"],
    "summary": "Brief 1-2 sentence summary",
    "confidence": 0.92,
    "reasoning": "Brief explanation of market relevance"
  }`;

      try {
         const response = await this.generateContent(prompt, {
            temperature: 0.1,
         });

         // Try to parse JSON response
         const jsonMatch = response.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
         }

         // Fallback if JSON parsing fails
         return {
            financial_instruments: [],
            key_entities: [],
            market_events: [],
            sentiment: 'neutral',
            sentiment_score: 0.5,
            betting_keywords: this._extractFallbackKeywords(tweetText),
            categories: [],
            summary: 'Unable to generate summary - LLM parsing failed',
            confidence: 0.1,
            reasoning: 'Failed to parse LLM response, using fallback',
            raw_response: response,
         };
      } catch (error) {
         console.error('LLM tweet analysis failed:', error.message);

         // Return fallback analysis
         return {
            financial_instruments: [],
            key_entities: [],
            market_events: [],
            sentiment: 'neutral',
            sentiment_score: 0.5,
            betting_keywords: this._extractFallbackKeywords(tweetText),
            categories: [],
            summary: 'Unable to generate summary - LLM service unavailable',
            confidence: 0.0,
            reasoning: `LLM analysis failed: ${error.message}`,
            error: error.message,
         };
      }
   }

   _extractFallbackKeywords(text) {
      // Smart fallback - extract ONLY proper nouns and ticker symbols
      // This is a last resort when LLM fails - be conservative to avoid garbage

      // Extract capitalized words/phrases (likely proper nouns: "Elon", "Apple", "Bitcoin")
      const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];

      // Extract all-caps ticker symbols (1-5 chars: "TSLA", "BTC", "DOGE")
      const tickers = text.match(/\b[A-Z]{1,5}\b/g) || [];

      // Combine and deduplicate, limit to 5
      const combined = [...new Set([...properNouns, ...tickers])];
      return combined.slice(0, 5);
   }
}

export default GoogleAIClient;
