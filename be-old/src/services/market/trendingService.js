// services/trendingService.js

// Ana kategoriler - UI'da göstermek istediğin kategoriler
const PRIMARY_CATEGORIES = {
   crypto: { label: 'CRYPTO', icon: '₿', priority: 1 },
   geopolitics: { label: 'GEOPOLITICS', icon: '🌍', priority: 2 },
   politics: { label: 'POLITICS', icon: '🗳️', priority: 3 },
   business: { label: 'BUSINESS', icon: '📈', priority: 4 },
   ai: { label: 'AI & TECH', icon: '🤖', priority: 5 },
   economy: { label: 'ECONOMY', icon: '💰', priority: 6 },
   sports: { label: 'SPORTS', icon: '🏀', priority: 7 },
};

// Bazı tag'ler daha spesifik, bunları ana kategoriye map'le
const TAG_TO_CATEGORY = {
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
};

const MIN_LIQUIDITY = 10000; // Reduced from 50000
const MIN_VOLUME_24H = 1000; // Reduced from 5000
const MIN_HOT_MARKETS = 4; // Minimum number of hot markets to return
const MIN_TRENDING_MARKETS = 4; // Minimum number of trending markets to return

/**
 * Market'ın ana kategorisini belirle
 */
function extractCategory(market) {
   if (!market.tags || market.tags.length === 0) {
      return 'other';
   }

   // Tag'leri öncelik sırasına göre kontrol et
   for (const tag of market.tags) {
      const slug = tag.slug?.toLowerCase();
      if (TAG_TO_CATEGORY[slug]) {
         return TAG_TO_CATEGORY[slug];
      }
   }

   // forceShow=true olan tag'i tercih et
   const forceShowTag = market.tags.find((t) => t.forceShow);
   if (forceShowTag && TAG_TO_CATEGORY[forceShowTag.slug]) {
      return TAG_TO_CATEGORY[forceShowTag.slug];
   }

   // İlk tag'i kullan
   const firstTag = market.tags[0]?.slug?.toLowerCase();
   return TAG_TO_CATEGORY[firstTag] || firstTag || 'other';
}

/**
 * Market verisini UI için işle
 */
function processMarket(market) {
   const category = extractCategory(market);
   const categoryConfig = PRIMARY_CATEGORIES[category] || {
      label: category.toUpperCase(),
      icon: '📊',
      priority: 99,
   };

   // Outcome prices parse
   let yesPrice = 0,
      noPrice = 0;
   try {
      const prices = JSON.parse(market.outcomePrices || '["0","0"]');
      yesPrice = parseFloat(prices[0]) || 0;
      noPrice = parseFloat(prices[1]) || 0;
   } catch {}

   // Outcomes parse (Trump/Biden gibi)
   let outcomes = null;
   try {
      const outcomeNames = JSON.parse(market.outcomes || '["Yes","No"]');
      const prices = JSON.parse(market.outcomePrices || '["0","0"]');
      outcomes = outcomeNames.map((name, i) => ({
         name,
         price: parseFloat(prices[i]) || 0,
         priceDisplay: `${Math.round((parseFloat(prices[i]) || 0) * 100)}¢`,
      }));
   } catch {}

   // Volume spike hesapla
   const volume24h = market.volume24hr || 0;
   const volume1wk = market.volume1wk || 0;
   const avgDailyVolume = volume1wk / 7;
   const volumeSpike =
      avgDailyVolume > 0 ? (volume24h / avgDailyVolume - 1) * 100 : 0;

   // Volatility score
   const priceChange1h = market.oneHourPriceChange || 0;
   const priceChange24h = market.oneDayPriceChange || 0;
   const volatilityScore =
      Math.abs(priceChange1h) * 3 + Math.abs(priceChange24h);

   // Hot score
   const hotScore =
      Math.abs(priceChange1h) * 300 +
      Math.abs(priceChange24h) * 100 +
      Math.max(0, volumeSpike) * 0.5;

   return {
      id: market.id,
      slug: market.slug,
      question: market.question,
      image: market.image,
      icon: market.icon,

      // Category
      category,
      categoryLabel: categoryConfig.label,
      categoryIcon: categoryConfig.icon,
      categoryPriority: categoryConfig.priority,

      // Prices
      yesPrice,
      noPrice,
      yesPriceDisplay: `${Math.round(yesPrice * 100)}¢`,
      noPriceDisplay: `${Math.round(noPrice * 100)}¢`,
      probability: Math.round(yesPrice * 100),
      outcomes,

      // Volume & Liquidity
      volume: market.volumeNum || 0,
      volume24h,
      volume1wk,
      liquidity: market.liquidityNum || 0,
      volumeDisplay: formatVolume(market.volumeNum),
      volume24hDisplay: formatVolume(volume24h),
      liquidityDisplay: formatVolume(market.liquidityNum),

      // Price changes
      priceChange1h,
      priceChange24h,
      priceChange1wk: market.oneWeekPriceChange || 0,
      priceChange1mo: market.oneMonthPriceChange || 0,

      // Order book
      bestBid: market.bestBid,
      bestAsk: market.bestAsk,
      spread: market.spread,

      // Dates
      endDate: market.endDate,

      // Computed scores
      volumeSpike,
      volatilityScore,
      hotScore,

      // Raw tags for debugging
      tags: market.tags?.map((t) => t.slug) || [],
   };
}

/**
 * Volume'u formatla
 */
function formatVolume(vol) {
   if (!vol) return '$0';
   if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
   if (vol >= 1000) return `$${(vol / 1000).toFixed(0)}K`;
   return `$${vol.toFixed(0)}`;
}

/**
 * TRENDING MARKETS: Her kategoriden en yüksek volume'lu market
 */
function getTrendingMarkets(allMarkets) {
   const processed = allMarkets.filter((m) => m.active).map(processMarket);

   // Kategorilere grupla
   const byCategory = {};
   for (const market of processed) {
      if (!byCategory[market.category]) {
         byCategory[market.category] = [];
      }
      byCategory[market.category].push(market);
   }

   // Her kategoriden en yüksek volume olanı seç
   const trending = [];
   for (const [category, markets] of Object.entries(byCategory)) {
      // Volume'a göre sırala (önce volume24h, sonra total volume)
      const sorted = markets.sort((a, b) => {
         const aScore = (b.volume24h || 0) * 10 + (b.volume || 0);
         const bScore = (a.volume24h || 0) * 10 + (a.volume || 0);
         return aScore - bScore;
      });

      if (sorted.length > 0 && PRIMARY_CATEGORIES[category]) {
         trending.push({
            ...sorted[0],
            isTrending: true,
         });
      }
   }

   // Category priority'ye göre sırala
   let result = trending.sort(
      (a, b) => a.categoryPriority - b.categoryPriority
   );

   // Eğer yeterli trending market yoksa, en yüksek volume'lu marketleri ekle
   if (result.length < MIN_TRENDING_MARKETS) {
      const remainingNeeded = MIN_TRENDING_MARKETS - result.length;
      const allSorted = processed
         .filter((m) => !result.find((r) => r.id === m.id))
         .sort((a, b) => (b.volume || 0) - (a.volume || 0))
         .slice(0, remainingNeeded)
         .map((m) => ({ ...m, isTrending: true }));

      result = [...result, ...allSorted];
   }

   return result;
}

/**
 * HOT MARKETS: Activity spike + volatility'ye göre
 */
function getHotMarkets(allMarkets) {
   const processed = allMarkets
      .filter((m) => m.active && (m.liquidityNum || 0) >= MIN_LIQUIDITY)
      .map(processMarket);

   // İlk olarak strict filtre ile hot marketleri bul
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

   // Eğer yeterli hot market yoksa, daha yumuşak kriterlere göre ekle
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
               m.volume24h > 1000
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

   // Eğer hala yeterli yoksa, sadece volume'a göre ekle
   if (hot.length < MIN_HOT_MARKETS) {
      const remainingNeeded = MIN_HOT_MARKETS - hot.length;
      const existingIds = new Set(hot.map((m) => m.id));

      const fallback = processed
         .filter((m) => !existingIds.has(m.id))
         .sort((a, b) => (b.volume || 0) - (a.volume || 0))
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

function getHotReason(market) {
   if (market.priceChange1h > 0.05) return 'RAPID_RISE';
   if (market.priceChange1h < -0.05) return 'SELL_OFF';
   if (market.volumeSpike > 200) return 'VOLUME_SPIKE';
   if (market.priceChange24h > 0.03) return 'RISING';
   if (market.priceChange24h < -0.03) return 'FALLING';
   if (market.volumeSpike > 50) return 'HIGH_ACTIVITY';
   return 'VOLATILE';
}

function getHotReasonConfig(market) {
   const reason = getHotReason(market);
   const configs = {
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
   return configs[reason] || configs.VOLATILE;
}

/**
 * Ana fonksiyon - tüm veriyi işle
 */
export function processTrendingData(rawMarkets) {
   return {
      trending: getTrendingMarkets(rawMarkets),
      hot: getHotMarkets(rawMarkets),
      lastUpdated: new Date().toISOString(),
   };
}

export { processMarket, getTrendingMarkets, getHotMarkets, PRIMARY_CATEGORIES };
