import PolymarketService from '../application/polymarketService.js';
import MarketCacheService from './marketCacheService.js';

/**
 * Service for matching tweet analysis keywords with Polymarket markets
 * Handles searching, filtering, and ranking markets based on keywords
 */
class MarketMatchingService {
    constructor(options = {}) {
        this.polymarket = options.polymarket || new PolymarketService();
        this.cache = options.cache || new MarketCacheService();
        this.log = options.log || console;
        this.maxMarketsPerKeyword = options.maxMarketsPerKeyword || 5;
    }

    /**
     * Find markets for a single keyword
     * Uses cache to avoid duplicate API calls
     * @param {string} keyword - Search keyword
     * @returns {Promise<array>} Array of matching markets
     */
    async findMarketsByKeyword(keyword) {
        // Check cache first
        const cached = this.cache.get(keyword);
        if (cached) {
            this.log.debug(`Using cached markets for keyword: ${keyword}`);
            return cached;
        }

        try {
            

            const searchResult = await this.polymarket.search(keyword, {
                size: this.maxMarketsPerKeyword
            });

            // Transform and cache result
            const markets = this._transformMarketData(searchResult);
            this.cache.set(keyword, markets);

            
            return markets;
        } catch (error) {
            console.error(`❌ [API] Error finding markets for keyword "${keyword}":`, error.message);
            return [];
        }
    }

    /**
     * Find markets for multiple keywords (batch operation)
     * More efficient than calling findMarketsByKeyword multiple times
     * @param {array} keywords - Array of keywords
     * @returns {Promise<object>} Map of keyword -> markets
     */
    async findMarketsByKeywords(keywords) {
        const results = {};
        const keywordsToSearch = [];
        const cachedResults = this.cache.batchGet(keywords);

        // Separate cached vs uncached keywords
        keywords.forEach(kw => {
            if (cachedResults[kw]) {
                results[kw] = cachedResults[kw];
            } else {
                keywordsToSearch.push(kw);
            }
        });

        // Search only non-cached keywords
        if (keywordsToSearch.length > 0) {

            const searchPromises = keywordsToSearch.map(kw =>
                this.findMarketsByKeyword(kw)
                    .then(markets => [kw, markets])
                    .catch(err => {
                        console.error(`❌ [API] Failed to search markets for "${kw}":`, err.message);
                        return [kw, []];
                    })
            );

            const searchResults = await Promise.all(searchPromises);
            searchResults.forEach(([kw, markets]) => {
                results[kw] = markets;
            });
        } 

        return results;
    }

    /**
     * Get market updates for a tweet with analysis keywords
     * @param {object} tweet - Tweet with tweetDetails and analysis
     * @returns {Promise<object>} Market data keyed by keyword
     */
    async getMarketUpdatesForTweet(tweet) {
        if (!tweet.analysis?.keywords || tweet.analysis.keywords.length === 0) {
            return {};
        }

        return this.findMarketsByKeywords(tweet.analysis.keywords);
    }

    /**
     * Get market updates for multiple tweets
     * @param {array} tweets - Array of tweets with analysis
     * @returns {Promise<object>} Map of tweetId -> markets by keyword
     */
    async getMarketUpdatesForTweets(tweets) {
        const results = {};

        const tweetPromises = tweets.map(tweet =>
            this.getMarketUpdatesForTweet(tweet)
                .then(markets => ({
                    tweetId: tweet.tweetDetails?.tweetId || tweet.id,
                    markets
                }))
                .catch(err => {
                    this.log.error(`Error getting market updates for tweet`, err.message);
                    return {
                        tweetId: tweet.tweetDetails?.tweetId || tweet.id,
                        markets: {}
                    };
                })
        );

        const updates = await Promise.all(tweetPromises);
        updates.forEach(({ tweetId, markets }) => {
            results[tweetId] = markets;
        });

        return results;
    }

    /**
     * Transform raw Polymarket API response to cleaner format
     * YORUM: Polymarket API response'ı parse ediyoruz
     * API response structure: { events: [{ markets: [...] }] }
     * @private
     * @param {object|array} searchResult - Raw API response
     * @returns {array} Transformed markets
     */
    _transformMarketData(searchResult) {
        // Handle null/undefined
        if (!searchResult) {
            
            return [];
        }

        let markets = [];

        // YORUM: Polymarket API { events: [{markets: [...]}] } formatında döndürüyor
        // Extract markets from Polymarket API response structure
        if (searchResult.events && Array.isArray(searchResult.events)) {
            

            // Iterate through events and extract all markets
            searchResult.events.forEach(event => {
                if (event.markets && Array.isArray(event.markets)) {
                    markets = markets.concat(event.markets);
                }
            });

            
        }
       

        return markets.map(market => {
            // Parse outcomes if they're JSON strings
            let outcomes = market.outcomes;
            if (typeof outcomes === 'string') {
                try {
                    outcomes = JSON.parse(outcomes);
                } catch (e) {
                    outcomes = ['Yes', 'No'];
                }
            }

            // Parse outcomePrices if they're JSON strings
            let outcomePrices = market.outcomePrices;
            if (typeof outcomePrices === 'string') {
                try {
                    outcomePrices = JSON.parse(outcomePrices);
                } catch (e) {
                    outcomePrices = [];
                }
            }

            // Calculate probability from outcomePrices (first outcome)
            let probability = market.probability || market.lastTradePrice;
            if (!probability && outcomePrices && outcomePrices.length > 0) {
                probability = parseFloat(outcomePrices[0]);
            }

            return {
                id: market.id || market.marketId,
                question: market.question || market.title,
                slug: market.slug,
                probability: probability,
                volume: market.volume || market.volumeNum,
                liquidity: market.liquidity || market.liquidityNum,
                bestBid: market.bestBid,
                bestAsk: market.bestAsk,
                url: market.url,
                lastTradePrice: market.lastTradePrice,
                outcomes: outcomes,
                outcomePrices: outcomePrices,
                endDate: market.endDate,
                startDate: market.startDate,
                closed: market.closed,
                active: market.active,
                updatedAt: market.updatedAt || new Date().toISOString(),
                // YORUM: Tüm market verisini rawData'da saklıyoruz
                // Preserve complete market data for display purposes
                rawData: market
            };
        }).filter(market => {
            // Filter markets by volume - only include markets with volume > $1500
            const volume = parseFloat(market.volume) || 0;
            return volume > 1500;
        }).filter(market => {
            // Filter out markets with passed endDate - only include active markets
            if (!market.endDate) {
                return true; // Include markets without endDate
            }
            const endDate = new Date(market.endDate).getTime();
            const now = new Date().getTime();
            return endDate > now; // Only include markets that haven't ended yet
        }).sort((a, b) => {
            // Multi-metric sort: volume > liquidity > updatedAt (all descending)
            // 1. Primary: Sort by volume (highest first)
            const volumeA = parseFloat(a.volume) || 0;
            const volumeB = parseFloat(b.volume) || 0;
            if (volumeB !== volumeA) {
                return volumeB - volumeA;
            }

            // 2. Secondary: Sort by liquidity (highest first) if volumes are equal
            const liquidityA = parseFloat(a.liquidity) || 0;
            const liquidityB = parseFloat(b.liquidity) || 0;
            if (liquidityB !== liquidityA) {
                return liquidityB - liquidityA;
            }

            // 3. Tertiary: Sort by updatedAt (newest first) if volumes and liquidity are equal
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return dateB - dateA;
        });
    }

    /**
     * Clear cache for a keyword
     * Useful when you want to force refresh for specific keywords
     * @param {string} keyword - Keyword to clear from cache
     */
    clearCacheForKeyword(keyword) {
        this.cache.clear(keyword);
    }

    /**
     * Clear all market cache
     */
    clearAllCache() {
        this.cache.clearAll();
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getCacheStats() {
        return this.cache.getStats();
    }
}

export default MarketMatchingService;
