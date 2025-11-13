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
  Analyze this tweet to extract prediction market opportunities. Focus on:

  **CRITICAL RULES:**
  1. IGNORE stop words (when, where, what, who, why, how, will, the, is, are, etc.)
  2. Extract MULTI-WORD PHRASES, not single words (e.g., "turkey election" NOT "turkey", "when")
  3. Focus on SPECIFIC EVENTS, ENTITIES, and TOPICS that can be predicted
  4. Combine related words into meaningful search terms

  **Extract:**
  - **Financial Instruments**: Stocks, crypto, commodities, currencies (symbols/tickers)
  - **Key Entities**: Companies, people, teams, countries, organizations
  - **Market Events**: Specific events, elections, announcements, sports matches, releases
  - **Betting Keywords**: 2-4 word phrases that describe prediction market topics
    * Examples: "turkey election", "bitcoin price", "apple earnings", "world cup winner"
    * NOT: "when", "will", "happen", "what", "is"
  - **Sentiment**: positive/negative/neutral with a confidence score (0.0-1.0)
  - **Summary**: A brief 1-2 sentence summary of the key prediction market relevance
  - **Categories**: crypto, sports, politics, finance, entertainment, tech, etc.

  Tweet: "${tweetText}"

  Respond ONLY with valid JSON:
  {
    "financial_instruments": ["BTC", "TSLA"],
    "key_entities": ["Elon Musk", "Turkey", "Apple"],
    "market_events": ["turkey election", "iphone launch"],
    "sentiment": "positive|negative|neutral",
    "sentiment_score": 0.85,
    "betting_keywords": ["turkey election", "bitcoin price"],
    "categories": ["politics", "crypto"],
    "summary": "Brief 1-2 sentence summary of prediction market relevance",
    "confidence": 0.95,
    "reasoning": "Brief explanation"
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
      // Simple fallback keyword extraction - filters stop words and question words
      const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
      const stopWords = new Set([
         'the',
         'and',
         'for',
         'are',
         'but',
         'not',
         'you',
         'all',
         'can',
         'had',
         'her',
         'was',
         'one',
         'our',
         'out',
         'day',
         'get',
         'has',
         'him',
         'his',
         'how',
         'its',
         'may',
         'new',
         'now',
         'old',
         'see',
         'two',
         'way',
         'who',
         'boy',
         'did',
         'use',
         'each',
         'she',
         'many',
         'some',
         'time',
         'very',
         'when',
         'come',
         'here',
         'just',
         'like',
         'long',
         'make',
         'over',
         'such',
         'take',
         'than',
         'them',
         'well',
         'were',
         'what',
         'where',
         'why',
         'will',
         'would',
         'could',
         'should',
         'been',
         'have',
         'does',
         'happen',
         'about',
         'into',
         'than',
         'that',
         'this',
         'with',
         'from',
         'let'
      ]);

      return words.filter((word) => !stopWords.has(word)).slice(0, 5); // limit to 5 keywords
   }
}

export default GoogleAIClient;
