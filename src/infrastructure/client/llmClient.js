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

  **CRITICAL FILTERING RULES - REJECT UNLESS SPECIFICALLY MET:**
  1. REJECT all casual/filler words: "try", "like", "lit", "totally", "new", "really", "very", "just", etc.
  2. REJECT all generic verbs and adjectives not tied to events: "happen", "get", "make", "have", "is", "are", etc.
  3. REJECT greetings, exclamations, opinions without context: "oh", "wow", "cool", "bad", "good", "awesome", etc.
  4. REJECT hashtags and slang as standalone keywords
  5. Extract ONLY if the content enables someone to search Polymarket for a specific prediction
  6. Combine related words into 2-4 word searchable phrases

  **ONLY Extract If Relevant:**
  - **Financial Instruments**: Stock tickers, crypto symbols, real commodities (BTC, TSLA, GLD, etc.) - NOT generic finance terms
  - **Key Entities**: Named people, companies, countries, organizations (Elon Musk, Apple, USA, Tesla) - NOT generic nouns
  - **Market Events**: Specific, datable events (elections, earnings reports, product launches, sports matches, court cases, economic reports)
  - **Betting Keywords**: ONLY 2-4 word phrases that match actual Polymarket search terms
    * GOOD examples: "Bitcoin price above 100k", "Trump 2024 election", "Apple iPhone 16 sales", "World Cup 2026 winner"
    * BAD examples: "try", "totally", "lit", "new", "messaging system", "collapsing" (too vague without subject)
  - **Sentiment**: positive/negative/neutral with confidence score (0.0-1.0)
  - **Summary**: 1-2 sentences about prediction market relevance
  - **Categories**: crypto, sports, politics, finance, entertainment, tech, science, etc.

  **Confidence Scoring:**
  - confidence: 0.9-1.0 = Clear, searchable prediction market topic
  - confidence: 0.6-0.9 = Related but may need clarification
  - confidence: Below 0.6 = Too vague, DON'T INCLUDE in results

  **Categories Rule:**
  - Select MAXIMUM 2 categories - pick the most relevant ones only
  - Do NOT list more than 2 categories even if multiple apply
  - Order by relevance: primary category first

  Tweet: "${tweetText}"

  Respond ONLY with valid JSON. OMIT empty arrays. Only include fields with relevant data:
  {
    "financial_instruments": ["BTC", "TSLA"],
    "key_entities": ["Elon Musk", "Apple"],
    "market_events": ["Apple earnings report Q4 2025"],
    "betting_keywords": ["Apple earnings beat", "Tesla stock price"],
    "sentiment": "positive",
    "sentiment_score": 0.85,
    "categories": ["finance", "tech"],
    "summary": "Brief 1-2 sentence summary",
    "confidence": 0.92,
    "reasoning": "Brief explanation of why this is market-relevant"
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
