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
  Analyze the following tweet for financial/market opportunities and betting scenarios. Extract:

  1. **Financial Instruments**: Any stocks, crypto, commodities, currencies mentioned
  2. **Key Entities**: Companies, people, teams, countries that could affect markets
  3. **Market Events**: News, announcements, events that could create betting opportunities
  4. **Sentiment**: Positive, negative, or neutral toward mentioned entities
  5. **Betting Keywords**: Terms that could translate to Polymarket searches
  6. **Categories**: Tag as crypto, sports, politics, commodities, stocks, etc.

  Tweet: "${tweetText}"

  Respond in JSON format:
  {
    "financial_instruments": ["list of tickers, crypto symbols, commodities"],
    "key_entities": ["companies, people, teams, countries"],
    "market_events": ["specific events or news mentioned"],
    "sentiment": "positive|negative|neutral",
    "betting_keywords": ["searchable terms for prediction markets"],
    "categories": ["crypto", "sports", "politics", "commodities", "stocks"],
    "confidence": 0.95,
    "reasoning": "Brief explanation of analysis"
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
            betting_keywords: this._extractFallbackKeywords(tweetText),
            categories: [],
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
            betting_keywords: this._extractFallbackKeywords(tweetText),
            categories: [],
            confidence: 0.0,
            reasoning: `LLM analysis failed: ${error.message}`,
            error: error.message,
         };
      }
   }

   _extractFallbackKeywords(text) {
      // Simple fallback keyword extraction
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
      ]);

      return words.filter((word) => !stopWords.has(word)).slice(0, 5); // limit to 5 keywords
   }
}

export default GoogleAIClient;
