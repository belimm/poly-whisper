/**
 * Market Matching Service - TypeScript
 *
 * Service for matching tweet analysis keywords with Polymarket markets
 *
 * Now supports TWO modes:
 * 1. INTELLIGENT MODE (default): Uses GPT-4 mini + Market Catalog for semantic matching
 * 2. LEGACY MODE (fallback): Uses keyword search + Polymarket API
 */

import IntelligentMarketMatcher from './intelligentMarketMatcher.js';
import type {
  MarketMatchingServiceOptions,
  EnrichedTweet,
  MatchingResult,
  MatchingOptions,
  Logger,
  MatcherStats,
} from '../../types/index.js';

export default class MarketMatchingService {
  private intelligentMatcher: IntelligentMarketMatcher | null;
  private log: Logger;
  private maxMarketsPerKeyword: number;
  private useIntelligentMode: boolean;

  // Stats
  private stats = {
    intelligentMatches: 0,
    legacyMatches: 0,
    totalMatches: 0,
  };

  constructor(options: MarketMatchingServiceOptions = {}) {
    // New intelligent matcher (uses catalog + GPT-4 mini)
    this.intelligentMatcher = options.intelligentMatcher as IntelligentMarketMatcher | null;

    // Configuration
    this.log = options.log || console;
    this.maxMarketsPerKeyword = options.maxMarketsPerKeyword || 5;
    this.useIntelligentMode = options.useIntelligentMode !== false; // Default: true

    // Try to initialize intelligent matcher if not provided
    if (!this.intelligentMatcher && this.useIntelligentMode) {
      try {
        this.intelligentMatcher = new IntelligentMarketMatcher(options);
        this.log.info(
          '✅ Intelligent market matching enabled (GPT-4 mini + Catalog)'
        );
      } catch (error) {
        this.log.warn(
          '⚠️  Failed to initialize intelligent matching:',
          (error as Error).message
        );
        this.log.warn('⚠️  Will use legacy keyword matching as fallback');
      }
    }
  }

  /**
   * Match a tweet to relevant markets
   * Automatically chooses intelligent or legacy mode
   */
  async matchTweet(
    tweet: EnrichedTweet,
    options: MatchingOptions = {}
  ): Promise<MatchingResult> {
    this.stats.totalMatches++;

    // Try intelligent mode first
    if (
      this.useIntelligentMode &&
      this.intelligentMatcher?.isAvailable()
    ) {
      try {
        const tweetText =
          tweet.tweetDetails?.text || (tweet as unknown as { text: string }).text || '';

        const result = await this.intelligentMatcher.matchTweet(
          tweetText,
          options
        );

        if (result.success) {
          this.stats.intelligentMatches++;
          this.log.info(
            `✅ Used intelligent matching (${result.matches.length} markets)`
          );
          return result;
        }
      } catch (error) {
        this.log.warn(
          '⚠️  Intelligent matching failed, falling back to legacy:',
          (error as Error).message
        );
      }
    }

    // Fallback to legacy keyword matching
    this.stats.legacyMatches++;
    this.log.info('📝 Using legacy keyword matching');
    return this._legacyMatchByKeywords(tweet, options);
  }

  /**
   * Legacy keyword-based matching (backwards compatible)
   * @private
   */
  private async _legacyMatchByKeywords(
    tweet: EnrichedTweet,
    options: MatchingOptions = {}
  ): Promise<MatchingResult> {
    const keywords = tweet.analysis?.keywords || [];

    if (keywords.length === 0) {
      return {
        success: false,
        matches: [],
        error: 'No keywords in tweet analysis',
        source: 'legacy-keyword',
      };
    }

    // For now, return empty matches since we don't have legacy services
    // This can be implemented later if needed
    return {
      success: true,
      matches: [],
      source: 'legacy-keyword',
      keywords,
    };
  }

  /**
   * Get matching statistics
   * Shows usage of intelligent vs legacy matching
   */
  getMatchingStats(): {
    intelligentMatches: number;
    legacyMatches: number;
    totalMatches: number;
    intelligentModeEnabled: boolean;
    intelligentMatcherAvailable: boolean;
    intelligentMatcherStats: MatcherStats | null;
  } {
    return {
      ...this.stats,
      intelligentModeEnabled: this.useIntelligentMode,
      intelligentMatcherAvailable:
        this.intelligentMatcher?.isAvailable() || false,
      intelligentMatcherStats: this.intelligentMatcher?.getStats() || null,
    };
  }
}

