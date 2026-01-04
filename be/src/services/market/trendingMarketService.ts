/**
 * TrendingMarketService
 *
 * Processes market catalog data to identify:
 * - TRENDING MARKETS: Highest volume markets per category
 * - HOT MARKETS: Markets with high volatility and volume spikes
 */

import { MarketCatalogRow } from '../../types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface PrimaryCategory {
   label: string;
   icon: string;
   priority: number;
}

export interface ProcessedMarket extends Omit<MarketCatalogRow, 'outcomes'> {
   category: string;
   categoryLabel: string;
   categoryIcon: string;
   categoryPriority: number;

   // Parsed prices
   yesPrice: number;
   noPrice: number;
   yesPriceDisplay: string;
   noPriceDisplay: string;
   probability: number;

   // Override outcomes with parsed version
   outcomes: Array<{
      name: string;
      price: number;
      priceDisplay: string;
   }> | null;

   // Formatted displays
   volumeDisplay: string;
   volume24hDisplay: string;
   liquidityDisplay: string;

   // Price changes
   priceChange1h: number;
   priceChange24h: number;
   priceChange1wk: number;
   priceChange1mo: number;

   // Computed scores
   volumeSpike: number;
   volatilityScore: number;
   hotScore: number;

   // Tag slugs
   tagSlugs: string[];
}

export interface TrendingMarket extends ProcessedMarket {
   isTrending: true;
}

export interface HotMarket extends ProcessedMarket {
   hotReason:
      | 'RAPID_RISE'
      | 'SELL_OFF'
      | 'VOLUME_SPIKE'
      | 'RISING'
      | 'FALLING'
      | 'HIGH_ACTIVITY'
      | 'VOLATILE'
      | 'NEWS_BREAK';
   hotReasonConfig: {
      label: string;
      color: string;
      textColor: string;
   };
}

export interface TrendingData {
   trending: TrendingMarket[];
   hot: HotMarket[];
   lastUpdated: string;
}

// ============================================================================
// Constants
// ============================================================================

const PRIMARY_CATEGORIES: Record<string, PrimaryCategory> = {
   crypto: { label: 'CRYPTO', icon: '₿', priority: 1 },
   geopolitics: { label: 'GEOPOLITICS', icon: '🌍', priority: 2 },
   politics: { label: 'POLITICS', icon: '🗳️', priority: 3 },
   business: { label: 'BUSINESS', icon: '📈', priority: 4 },
   ai: { label: 'AI & TECH', icon: '🤖', priority: 5 },
   economy: { label: 'ECONOMY', icon: '💰', priority: 6 },
   sports: { label: 'SPORTS', icon: '🏀', priority: 7 },
};

const TAG_TO_CATEGORY: Record<string, string> = {
   crypto: 'crypto',
   bitcoin: 'crypto',
   'crypto-prices': 'crypto',
   stablecoins: 'crypto',
   geopolitics: 'geopolitics',
   ukraine: 'geopolitics',
   russia: 'geopolitics',
   iran: 'geopolitics',
   'middle-east': 'geopolitics',
   politics: 'politics',
   marijuana: 'politics',
   business: 'business',
   'big-tech': 'business',
   ai: 'ai',
   economy: 'economy',
   'economic-policy': 'economy',
   sports: 'sports',
};

const MIN_LIQUIDITY = 10000;
const MIN_VOLUME_24H = 1000;
const MIN_HOT_MARKETS = 4;
const MIN_TRENDING_MARKETS = 4;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract the primary category for a market based on its tags
 */
function extractCategory(market: MarketCatalogRow): string {
   if (!market.tags || market.tags.length === 0) {
      return 'other';
   }

   // Check tags in order for known categories
   for (const tag of market.tags) {
      const slug = tag.slug?.toLowerCase();
      if (TAG_TO_CATEGORY[slug]) {
         return TAG_TO_CATEGORY[slug];
      }
   }

   // Use the first tag if available
   const firstTag = market.tags[0]?.slug?.toLowerCase();
   return TAG_TO_CATEGORY[firstTag] || firstTag || 'other';
}

/**
 * Format volume/liquidity for display
 */
function formatVolume(vol: number | null | undefined): string {
   if (!vol) return '$0';
   if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
   if (vol >= 1000) return `$${(vol / 1000).toFixed(0)}K`;
   return `$${vol.toFixed(0)}`;
}

/**
 * Process a single market into the enriched format
 */
function processMarket(market: MarketCatalogRow): ProcessedMarket {
   const category = extractCategory(market);
   const categoryConfig = PRIMARY_CATEGORIES[category] || {
      label: category.toUpperCase(),
      icon: '📊',
      priority: 99,
   };

   // Parse outcome prices
   let yesPrice = 0;
   let noPrice = 0;
   try {
      const prices = JSON.parse(market.outcome_prices || '["0","0"]');
      yesPrice = parseFloat(prices[0]) || 0;
      noPrice = parseFloat(prices[1]) || 0;
   } catch {
      // Keep defaults
   }

   // Parse outcomes
   let outcomes: Array<{ name: string; price: number; priceDisplay: string }> | null =
      null;
   try {
      const outcomeNames = JSON.parse(market.outcomes || '["Yes","No"]');
      const prices = JSON.parse(market.outcome_prices || '["0","0"]');
      outcomes = outcomeNames.map((name: string, i: number) => ({
         name,
         price: parseFloat(prices[i]) || 0,
         priceDisplay: `${Math.round((parseFloat(prices[i]) || 0) * 100)}¢`,
      }));
   } catch {
      // Keep null
   }

   // Calculate volume spike (24h volume vs 7-day average)
   const volume24h = market.volume_24hr || 0;
   const volume1wk = market.volume_1wk || 0;
   const avgDailyVolume = volume1wk / 7;
   const volumeSpike =
      avgDailyVolume > 0 ? (volume24h / avgDailyVolume - 1) * 100 : 0;

   // Calculate volatility score
   const priceChange1h = 0; // Not available in current schema
   const priceChange24h = market.one_day_price_change || 0;
   const volatilityScore =
      Math.abs(priceChange1h) * 3 + Math.abs(priceChange24h);

   // Calculate hot score
   const hotScore =
      Math.abs(priceChange1h) * 300 +
      Math.abs(priceChange24h) * 100 +
      Math.max(0, volumeSpike) * 0.5;

   return {
      ...market,
      category,
      categoryLabel: categoryConfig.label,
      categoryIcon: categoryConfig.icon,
      categoryPriority: categoryConfig.priority,

      yesPrice,
      noPrice,
      yesPriceDisplay: `${Math.round(yesPrice * 100)}¢`,
      noPriceDisplay: `${Math.round(noPrice * 100)}¢`,
      probability: Math.round(yesPrice * 100),
      outcomes,

      volumeDisplay: formatVolume(market.volume_num),
      volume24hDisplay: formatVolume(volume24h),
      liquidityDisplay: formatVolume(market.liquidity),

      priceChange1h,
      priceChange24h,
      priceChange1wk: market.one_week_price_change || 0,
      priceChange1mo: market.one_month_price_change || 0,

      volumeSpike,
      volatilityScore,
      hotScore,

      tagSlugs: market.tags?.map((t) => t.slug) || [],
   };
}

/**
 * Determine the hot reason for a market
 */
function getHotReason(market: ProcessedMarket): HotMarket['hotReason'] {
   if (market.priceChange1h > 0.05) return 'RAPID_RISE';
   if (market.priceChange1h < -0.05) return 'SELL_OFF';
   if (market.volumeSpike > 200) return 'VOLUME_SPIKE';
   if (market.priceChange24h > 0.03) return 'RISING';
   if (market.priceChange24h < -0.03) return 'FALLING';
   if (market.volumeSpike > 50) return 'HIGH_ACTIVITY';
   return 'VOLATILE';
}

/**
 * Get display configuration for a hot reason
 */
function getHotReasonConfig(
   market: ProcessedMarket
): HotMarket['hotReasonConfig'] {
   const reason = getHotReason(market);
   const configs: Record<HotMarket['hotReason'], HotMarket['hotReasonConfig']> = {
      RAPID_RISE: { label: 'RAPID RISE', color: '#22c55e', textColor: '#fff' },
      SELL_OFF: { label: 'SELL OFF', color: '#ef4444', textColor: '#fff' },
      VOLUME_SPIKE: {
         label: 'VOLUME SPIKE',
         color: '#3b82f6',
         textColor: '#fff',
      },
      RISING: { label: 'RISING', color: '#22c55e', textColor: '#fff' },
      FALLING: { label: 'FALLING', color: '#ef4444', textColor: '#fff' },
      HIGH_ACTIVITY: { label: 'ACTIVE', color: '#6b7280', textColor: '#fff' },
      VOLATILE: { label: 'VOLATILE', color: '#8b5cf6', textColor: '#fff' },
      NEWS_BREAK: { label: 'NEWS BREAK', color: '#eab308', textColor: '#000' },
   };
   return configs[reason];
}

// ============================================================================
// Main Processing Functions
// ============================================================================

/**
 * Get trending markets (highest volume per category)
 */
function getTrendingMarkets(allMarkets: MarketCatalogRow[]): TrendingMarket[] {
   const processed = allMarkets.filter((m) => m.active).map(processMarket);

   // Group by category
   const byCategory: Record<string, ProcessedMarket[]> = {};
   for (const market of processed) {
      if (!byCategory[market.category]) {
         byCategory[market.category] = [];
      }
      byCategory[market.category].push(market);
   }

   // Select highest volume from each category
   const trending: TrendingMarket[] = [];
   for (const [category, markets] of Object.entries(byCategory)) {
      // Sort by volume (24h volume weighted higher than total volume)
      const sorted = markets.sort((a, b) => {
         const scoreA = (a.volume_24hr || 0) * 10 + (a.volume_num || 0);
         const scoreB = (b.volume_24hr || 0) * 10 + (b.volume_num || 0);
         return scoreB - scoreA;
      });

      if (sorted.length > 0 && PRIMARY_CATEGORIES[category]) {
         trending.push({
            ...sorted[0],
            isTrending: true,
         });
      }
   }

   // Sort by category priority
   let result = trending.sort(
      (a, b) => a.categoryPriority - b.categoryPriority
   );

   // If not enough trending markets, add highest volume markets
   if (result.length < MIN_TRENDING_MARKETS) {
      const remainingNeeded = MIN_TRENDING_MARKETS - result.length;
      const existingIds = new Set(result.map((m) => m.id));
      const additional = processed
         .filter((m) => !existingIds.has(m.id))
         .sort((a, b) => (b.volume_num || 0) - (a.volume_num || 0))
         .slice(0, remainingNeeded)
         .map((m) => ({ ...m, isTrending: true as const }));

      result = [...result, ...additional];
   }

   return result;
}

/**
 * Get hot markets (based on activity spike and volatility)
 */
function getHotMarkets(allMarkets: MarketCatalogRow[]): HotMarket[] {
   const processed = allMarkets
      .filter((m) => m.active && (m.liquidity || 0) >= MIN_LIQUIDITY)
      .map(processMarket);

   // First pass: strict criteria
   let hot = processed
      .filter(
         (m) =>
            m.hotScore > 5 ||
            m.volumeSpike > 50 ||
            Math.abs(m.priceChange1h) > 0.02 ||
            Math.abs(m.priceChange24h) > 0.05
      )
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(0, 10)
      .map((m) => ({
         ...m,
         hotReason: getHotReason(m),
         hotReasonConfig: getHotReasonConfig(m),
      }));

   // Second pass: relaxed criteria if needed
   if (hot.length < MIN_HOT_MARKETS) {
      const remainingNeeded = MIN_HOT_MARKETS - hot.length;
      const existingIds = new Set(hot.map((m) => m.id));

      const additional = processed
         .filter((m) => !existingIds.has(m.id))
         .filter(
            (m) =>
               m.hotScore > 1 ||
               m.volumeSpike > 20 ||
               Math.abs(m.priceChange24h) > 0.02 ||
               m.volume_24hr > MIN_VOLUME_24H
         )
         .sort((a, b) => b.hotScore - a.hotScore)
         .slice(0, remainingNeeded)
         .map((m) => ({
            ...m,
            hotReason: getHotReason(m),
            hotReasonConfig: getHotReasonConfig(m),
         }));

      hot = [...hot, ...additional];
   }

   // Final fallback: just use highest volume
   if (hot.length < MIN_HOT_MARKETS) {
      const remainingNeeded = MIN_HOT_MARKETS - hot.length;
      const existingIds = new Set(hot.map((m) => m.id));

      const fallback = processed
         .filter((m) => !existingIds.has(m.id))
         .sort((a, b) => (b.volume_num || 0) - (a.volume_num || 0))
         .slice(0, remainingNeeded)
         .map((m) => ({
            ...m,
            hotReason: getHotReason(m),
            hotReasonConfig: getHotReasonConfig(m),
         }));

      hot = [...hot, ...fallback];
   }

   return hot.slice(0, 10);
}

/**
 * Main function: Process all markets into trending and hot categories
 */
export function processTrendingData(
   rawMarkets: MarketCatalogRow[]
): TrendingData {
   return {
      trending: getTrendingMarkets(rawMarkets),
      hot: getHotMarkets(rawMarkets),
      lastUpdated: new Date().toISOString(),
   };
}

export { getTrendingMarkets, getHotMarkets, PRIMARY_CATEGORIES };
