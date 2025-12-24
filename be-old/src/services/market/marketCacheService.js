/**
 * Service for caching Polymarket data with TTL (Time To Live)
 * Reduces API calls by storing market search results temporarily
 */
class MarketCacheService {
    constructor(defaultTTL = 5 * 60 * 1000) {
        // Default TTL: 5 minutes
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
        this.log = console;
    }

    /**
     * Get cached market data by keyword
     * @param {string} keyword - Search keyword
     * @returns {object|null} Cached market data or null if expired
     */
    get(keyword) {
        const cacheKey = this._normalizeKeyword(keyword);
        const entry = this.cache.get(cacheKey);

        if (!entry) {
            return null;
        }

        // Check if cache has expired
        const now = Date.now();
        if (now > entry.expiresAt) {
            this.cache.delete(cacheKey);
            this.log.debug(`Cache expired for keyword: ${keyword}`);
            return null;
        }

        
        return entry.data;
    }

    /**
     * Set cache for a keyword with optional custom TTL
     * @param {string} keyword - Search keyword
     * @param {object} data - Market data to cache
     * @param {number} ttl - Optional custom TTL in milliseconds
     */
    set(keyword, data, ttl = this.defaultTTL) {
        const cacheKey = this._normalizeKeyword(keyword);
        const expiresAt = Date.now() + ttl;

        this.cache.set(cacheKey, {
            data,
            expiresAt,
            createdAt: Date.now(),
            keyword
        });

    }

    /**
     * Batch get - retrieve cache for multiple keywords
     * @param {array} keywords - Array of keywords to look up
     * @returns {object} Map of keyword -> cached data (null for misses)
     */
    batchGet(keywords) {
        const results = {};
        keywords.forEach(kw => {
            results[kw] = this.get(kw);
        });
        return results;
    }

    /**
     * Batch set - cache data for multiple keywords
     * @param {object} keywordDataMap - Map of keyword -> data
     * @param {number} ttl - Optional custom TTL
     */
    batchSet(keywordDataMap, ttl = this.defaultTTL) {
        Object.entries(keywordDataMap).forEach(([keyword, data]) => {
            this.set(keyword, data, ttl);
        });
    }

    /**
     * Clear specific keyword from cache
     * @param {string} keyword - Keyword to clear
     */
    clear(keyword) {
        const cacheKey = this._normalizeKeyword(keyword);
        this.cache.delete(cacheKey);
        this.log.debug(`Cleared cache for keyword: ${keyword}`);
    }

    /**
     * Clear all cache
     */
    clearAll() {
        const size = this.cache.size;
        this.cache.clear();
        this.log.debug(`Cleared all cache (${size} entries)`);
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats including size, hits, misses
     */
    getStats() {
        const entries = Array.from(this.cache.values());
        const totalEntries = entries.length;
        const expiredEntries = entries.filter(e => Date.now() > e.expiresAt).length;

        return {
            totalCached: totalEntries,
            expiredEntries,
            activeCached: totalEntries - expiredEntries,
            cacheKeys: Array.from(this.cache.keys())
        };
    }

    /**
     * Cleanup expired entries
     * Should be called periodically to free memory
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.log.debug(`Cleaned ${cleaned} expired cache entries`);
        }

        return cleaned;
    }

    /**
     * Normalize keyword for consistent caching
     * @private
     * @param {string} keyword
     * @returns {string} Normalized keyword
     */
    _normalizeKeyword(keyword) {
        return keyword.toLowerCase().trim();
    }
}

export default MarketCacheService;
