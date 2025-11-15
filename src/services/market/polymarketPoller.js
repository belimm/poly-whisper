import TweetDatabaseService from '../database/tweetDatabaseService.js';
import MarketMatchingService from './marketMatchingService.js';

/**
 * Service that periodically polls Polymarket for market data
 * and pushes updates to connected clients via WebSocket
 *
 * Architecture:
 * - Runs on configurable interval (default: 2-3 seconds)
 * - Fetches latest 10 tweets with keywords from database
 * - Searches Polymarket for markets matching those keywords
 * - Pushes real-time updates to all connected WebSocket clients
 */
class PolymarketPoller {
    constructor(options = {}) {
        this.tweetDB = options.tweetDB || new TweetDatabaseService();
        this.marketMatcher = options.marketMatcher || new MarketMatchingService();
        this.clientWS = options.clientWS; // WebSocket manager (required)
        this.tweetsArray = options.tweetsArray || []; // In-memory tweets array from app
        this.log = options.log || console;

        // Configuration
        this.pollingInterval = options.pollingInterval || 3000; // 3 seconds default
        this.tweetsLimit = options.tweetsLimit || 10;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;

        // State
        this.isRunning = false;
        this.pollCount = 0;
        this.lastPollTime = null;
        this.lastError = null;
        this.stats = {
            totalPolls: 0,
            successfulPolls: 0,
            failedPolls: 0,
            lastPollDuration: 0
        };

        // Polling timeout handle
        this.pollHandle = null;
    }

    /**
     * Start the polling service
     */
    async start() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        // Run first poll immediately, then schedule recurring polls
        await this._poll();
        this._scheduleNextPoll();
    }

    /**
     * Stop the polling service
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        if (this.pollHandle) {
            clearTimeout(this.pollHandle);
        }

        this.isRunning = false;
    }

    /**
     * Schedule next poll after configured interval
     * @private
     */
    _scheduleNextPoll() {
        if (!this.isRunning) return;

        this.pollHandle = setTimeout(() => {
            this._poll()
                .then(() => this._scheduleNextPoll())
                .catch(err => {
                    this.lastError = err;
                    this._scheduleNextPoll();
                });
        }, this.pollingInterval);
    }

    /**
     * Execute a single poll cycle
     * @private
     */
    async _poll() {
        const pollStartTime = Date.now();

        try {
            

            // 1. Fetch latest tweets with analysis
            
            const tweets = await this._getRecentTweetsWithAnalysis();

            if (tweets.length === 0) {
                console.log('⚠️  No tweets found for market updates');
                return;
            }

            

            // 2. Extract unique keywords from all tweets
            
            const keywords = this._extractUniqueKeywords(tweets);
            

            // 3. Get market data for all keywords
            
            const marketsByKeyword = await this.marketMatcher.findMarketsByKeywords(
                keywords
            );

            // Calculate total markets found
            const totalMarkets = Object.values(marketsByKeyword).reduce(
                (sum, markets) => sum + (markets?.length || 0),
                0
            );

            // 4. Transform data into update payload
            
            const updatePayload = this._buildUpdatePayload(tweets, marketsByKeyword);

            // 5. Broadcast to all connected clients
            this._broadcastMarketUpdates(updatePayload);

            // Update stats
            const pollDuration = Date.now() - pollStartTime;
            this.stats.totalPolls++;
            this.stats.successfulPolls++;
            this.stats.lastPollDuration = pollDuration;
            this.lastError = null;

            // Main polling summary log - one per poll cycle
            console.log(`📊 For last ${tweets.length} tweets, there are ${keywords.length} categories and ${totalMarkets} market(s)`);
        } catch (error) {
            this.stats.totalPolls++;
            this.stats.failedPolls++;
            this.lastError = error;

            console.error('❌ Poll cycle failed:', error.message);
        }
    }

    /**
     * Fetch recent tweets with analysis keywords
     * Prioritizes in-memory tweets for real-time data, falls back to database
     * @private
     * @returns {Promise<array>} Tweets with analysis
     */
    async _getRecentTweetsWithAnalysis() {
        try {
            // YORUM: Önce bellekteki tweet'leri kullan (real-time veri için)
            // In-memory tweets are always the freshest data
            if (this.tweetsArray && this.tweetsArray.length > 0) {
                const recentTweets = this.tweetsArray.slice(0, this.tweetsLimit);
                
                return recentTweets;
            }

            // YORUM: Eğer bellekte tweet yoksa veritabanından çek
            // Fallback to database if memory array is empty
            const { data } = await this.tweetDB.getTweetsWithAnalyses(
                this.tweetsLimit,
                0
            );
            return data || [];
        } catch (error) {
            this.log.error('Error fetching tweets from database:', error.message);
            return [];
        }
    }

    /**
     * Extract unique keywords from tweets
     * @private
     * @param {array} tweets - Tweets with analysis
     * @returns {array} Unique keywords
     */
    _extractUniqueKeywords(tweets) {
        const keywordSet = new Set();

        tweets.forEach(tweet => {
            if (tweet.analysis?.keywords && Array.isArray(tweet.analysis.keywords)) {
                tweet.analysis.keywords.forEach(kw => {
                    if (kw && typeof kw === 'string') {
                        keywordSet.add(kw.toLowerCase().trim());
                    }
                });
            }
        });

        return Array.from(keywordSet);
    }

    /**
     * Build market update payload for broadcasting
     * @private
     * @param {array} tweets - Tweets with analysis
     * @param {object} marketsByKeyword - Markets keyed by keyword
     * @returns {object} Update payload
     */
    _buildUpdatePayload(tweets, marketsByKeyword) {
        const tweetUpdates = tweets.map(tweet => ({
            tweetId: tweet.tweetDetails?.tweetId,
            tweetText: tweet.tweetDetails?.text,
            keywords: tweet.analysis?.keywords || [],
            markets: this._getMarketsForTweet(
                tweet.analysis?.keywords,
                marketsByKeyword
            ),
            sentiment: tweet.analysis?.sentiment,
            sentimentScore: tweet.analysis?.sentimentScore
        }));

        return {
            type: 'marketUpdate',
            timestamp: new Date().toISOString(),
            pollCycle: this.stats.totalPolls,
            tweets: tweetUpdates,
            summary: {
                tweetsProcessed: tweets.length,
                marketsFound: Object.values(marketsByKeyword).reduce(
                    (sum, markets) => sum + (markets?.length || 0),
                    0
                ),
                cacheStats: this.marketMatcher.getCacheStats()
            }
        };
    }

    /**
     * Get markets for a tweet's keywords
     * @private
     */
    _getMarketsForTweet(keywords, marketsByKeyword) {
        const markets = {};
        if (!keywords) return markets;

        keywords.forEach(keyword => {
            const keywordMarkets = marketsByKeyword[keyword];
            if (keywordMarkets && keywordMarkets.length > 0) {
                markets[keyword] = keywordMarkets;
            }
        });

        return markets;
    }

    /**
     * Broadcast market updates to all connected WebSocket clients
     * @private
     */
    _broadcastMarketUpdates(updatePayload) {
        if (!this.clientWS) {
            return;
        }

        try {
            this.clientWS.broadcastMessage(updatePayload);
        } catch (error) {
            // Silently ignore broadcast errors
        }
    }

    /**
     * Get current polling status
     * @returns {object} Status information
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            pollingInterval: this.pollingInterval,
            stats: this.stats,
            lastError: this.lastError?.message || null,
            cacheStats: this.marketMatcher.getCacheStats(),
            nextPollIn: this.isRunning ? this.pollingInterval : null
        };
    }

    /**
     * Force an immediate poll cycle
     * Useful for manual refreshes
     */
    async forcePoll() {
        return this._poll();
    }

    /**
     * Change polling interval (takes effect on next poll)
     * @param {number} newInterval - New interval in milliseconds
     */
    setPollingInterval(newInterval) {
        if (newInterval < 1000) {
            return false;
        }

        this.pollingInterval = newInterval;
        return true;
    }
}

export default PolymarketPoller;
