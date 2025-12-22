/**
 * Analysis Refresh Service
 * Handles refreshing tweet analysis against current market state
 */

import TweetDatabaseService from '../database/tweetDatabaseService';
import MarketMatchingService from '../market/marketMatchingService';
import TweetAnalyzer from '../../domain/tweetAnalyzer';
import type { EnrichedTweet, TweetAnalysis } from '../../types';
import type { Logger } from '../../types';

interface AnalysisRefreshServiceOptions {
  tweetDB: TweetDatabaseService;
  marketMatcher: MarketMatchingService;
  tweetAnalyzer: TweetAnalyzer;
  log?: Logger;
  refreshIntervalHours?: number; // How often to auto-refresh (default: 24 hours)
  batchSize?: number; // How many tweets to refresh at once
}

export class AnalysisRefreshService {
  private tweetDB: TweetDatabaseService;
  private marketMatcher: MarketMatchingService;
  private tweetAnalyzer: TweetAnalyzer;
  private log: Logger;
  private refreshIntervalHours: number;
  private batchSize: number;
  private refreshHandle: NodeJS.Timeout | null = null;

  constructor(options: AnalysisRefreshServiceOptions) {
    this.tweetDB = options.tweetDB;
    this.marketMatcher = options.marketMatcher;
    this.tweetAnalyzer = options.tweetAnalyzer;
    this.log = options.log || console;
    this.refreshIntervalHours = options.refreshIntervalHours || 24;
    this.batchSize = options.batchSize || 10;
  }

  /**
   * Refresh analysis for a single tweet against current markets
   */
  async refreshTweetAnalysis(tweetId: string): Promise<EnrichedTweet | null> {
    try {
      this.log.info(`🔄 Refreshing analysis for tweet: ${tweetId}`);

      // Get original tweet
      const originalTweet = await this.tweetDB.getTweetWithAnalysisById(tweetId);

      // Re-analyze tweet (may get updated keywords/categories)
      const refreshedAnalysis = await this.tweetAnalyzer.analyzeWithLLM(
        originalTweet.tweetDetails.text
      );

      // Re-match against current markets
      const matchResult = await this.marketMatcher.matchTweet(
        {
          ...originalTweet,
          analysis: refreshedAnalysis,
        },
        { maxMatches: 5, minRelevanceScore: 0.5 }
      );

      // Extract matched markets
      const markets = matchResult.success
        ? matchResult.matches.map((match) => ({
            market: match.market,
            relevance_score: match.relevance_score,
            reasoning: match.reasoning,
          }))
        : [];

      // Update analysis with refreshed data
      const dbTweet = await this.tweetDB.getTweetByTwitterId(
        originalTweet.tweetDetails.tweetId
      );

      // Save refreshed analysis
      await this.tweetDB.insertRefreshedAnalysis(
        dbTweet.id,
        refreshedAnalysis,
        markets
      );

      this.log.info(
        `✅ Refreshed analysis for tweet ${tweetId}: ${markets.length} markets matched`
      );

      return {
        ...originalTweet,
        analysis: refreshedAnalysis,
        markets,
        analysisRefreshedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.log.error(
        `❌ Failed to refresh analysis for tweet ${tweetId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Refresh analysis for multiple tweets (batch operation)
   */
  async refreshTweetsBatch(tweetIds: string[]): Promise<{
    refreshed: number;
    failed: number;
    results: Array<{ tweetId: string; success: boolean; marketsCount?: number }>;
  }> {
    const results: Array<{
      tweetId: string;
      success: boolean;
      marketsCount?: number;
    }> = [];
    let refreshed = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < tweetIds.length; i += this.batchSize) {
      const batch = tweetIds.slice(i, i + this.batchSize);

      const batchPromises = batch.map(async (tweetId) => {
        try {
          const result = await this.refreshTweetAnalysis(tweetId);
          if (result) {
            refreshed++;
            return {
              tweetId,
              success: true,
              marketsCount: result.markets?.length || 0,
            };
          } else {
            failed++;
            return { tweetId, success: false };
          }
        } catch (error: any) {
          failed++;
          this.log.error(`Failed to refresh tweet ${tweetId}:`, error.message);
          return { tweetId, success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + this.batchSize < tweetIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return { refreshed, failed, results };
  }

  /**
   * Auto-refresh analyses that are older than refreshIntervalHours
   */
  async refreshStaleAnalyses(limit = 50): Promise<number> {
    try {
      this.log.info('🔄 Starting auto-refresh of stale analyses...');

      // Get tweets that need refresh (older than refreshIntervalHours)
      const staleTweets = await this.tweetDB.getTweetsNeedingRefresh(
        this.refreshIntervalHours,
        limit
      );

      if (staleTweets.length === 0) {
        this.log.info('✅ No stale analyses to refresh');
        return 0;
      }

      this.log.info(`📊 Found ${staleTweets.length} tweets needing refresh`);

      const tweetIds = staleTweets.map((t) => t.tweetDetails.tweetId);
      const { refreshed } = await this.refreshTweetsBatch(tweetIds);

      this.log.info(`✅ Auto-refresh completed: ${refreshed} tweets refreshed`);

      return refreshed;
    } catch (error: any) {
      this.log.error('❌ Auto-refresh failed:', error.message);
      return 0;
    }
  }

  /**
   * Start periodic auto-refresh
   */
  startAutoRefresh(intervalHours = 24): void {
    if (this.refreshHandle) {
      this.stopAutoRefresh();
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    this.log.info(
      `🔄 Starting auto-refresh service (every ${intervalHours} hours)`
    );

    // Run immediately on start
    this.refreshStaleAnalyses().catch((error) => {
      this.log.error('Initial auto-refresh failed:', error);
    });

    // Then run periodically
    this.refreshHandle = setInterval(() => {
      this.refreshStaleAnalyses().catch((error) => {
        this.log.error('Periodic auto-refresh failed:', error);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
      this.log.info('⏹️  Auto-refresh service stopped');
    }
  }
}

export default AnalysisRefreshService;

