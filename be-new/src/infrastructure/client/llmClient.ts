/**
 * LLM clients for tweet analysis and market matching
 * Supports: Google AI (Gemini) and OpenAI (GPT-4 mini)
 */

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import type {
  TweetAnalysis,
  MatchingResult,
  CompactMarket,
  Logger,
} from '../../types/index.js';

interface GoogleAIClientOptions {
  apiKey?: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface OpenAIClientOptions {
  apiKey?: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface GenerateContentOptions {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export class GoogleAIClient {
  private apiKey: string;
  private model: string;
  private maxRetries: number;
  private retryDelay: number;
  private genAI: GoogleGenAI;

  constructor(options: GoogleAIClientOptions = {}) {
    this.apiKey =
      options.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      '';

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

  async generateContent(
    prompt: string,
    options: GenerateContentOptions = {}
  ): Promise<string> {
    let lastError: Error | null = null;

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
        lastError = error as Error;
        console.warn(
          `Google AI request attempt ${attempt} failed:`,
          (error as Error).message
        );

        if (attempt < this.maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryDelay * attempt)
          );
        }
      }
    }

    throw new Error(
      `Google AI request failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  // Specialized method for tweet analysis
  async analyzeTweet(tweetText: string): Promise<TweetAnalysis> {
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
        return JSON.parse(jsonMatch[0]) as TweetAnalysis;
      }

      // Fallback if JSON parsing fails
      return {
        sentiment: 'neutral',
        sentiment_score: 0.5,
        keywords: this._extractFallbackKeywords(tweetText),
        categories: [],
        summary: 'Unable to generate summary - LLM parsing failed',
        confidence: 0.1,
        reasoning: 'Failed to parse LLM response, using fallback',
      };
    } catch (error) {
      console.error('LLM tweet analysis failed:', (error as Error).message);

      // Return fallback analysis
      return {
        sentiment: 'neutral',
        sentiment_score: 0.5,
        keywords: this._extractFallbackKeywords(tweetText),
        categories: [],
        summary: 'Unable to generate summary - LLM service unavailable',
        confidence: 0.0,
        reasoning: `LLM analysis failed: ${(error as Error).message}`,
      };
    }
  }

  private _extractFallbackKeywords(text: string): string[] {
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
        matches: matchedMarkets,
        tweet_summary: result.tweet_summary,
        confidence: result.confidence,
        source: 'intelligent-gpt4-mini',
      };
    } catch (error) {
      console.error('OpenAI market matching failed:', (error as Error).message);
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
      console.error('OpenAI tweet analysis failed:', (error as Error).message);
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

export default GoogleAIClient;

