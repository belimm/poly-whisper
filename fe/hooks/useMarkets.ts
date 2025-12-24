import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Market } from '@/lib/types';

interface UseMarketsOptions {
   tweetId?: string | null;
   marketIds?: string[];
   q?: number;
   qc?: number;
   autoFetch?: boolean;
}

export function useMarkets(options: UseMarketsOptions) {
   const { tweetId, marketIds, q = 1, qc = 1, autoFetch = true } = options;
   const [markets, setMarkets] = useState<Market[]>([]);
   const [lastRefreshTime, setLastRefreshTime] = useState("")
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   // Use ref to track the last fetched IDs to prevent duplicate requests
   const lastFetchedIdsRef = useRef<string>('');

   const fetchMarketDetails = async (ids: string[]) => {
      try {
         setLoading(true);
         setError(null);

         if (ids.length === 0) {
            setMarkets([]);
            return;
         }

         const data = await api.getMarketDetails(ids);

         // Add computed fields for backward compatibility
         const enrichedMarkets = data.markets.map(market => ({
            ...market,
            probability: (() => {
               try {
                  const prices = JSON.parse(market.outcome_prices) as string[];
                  return parseFloat(prices[0] || '0');
               } catch {
                  return 0;
               }
            })(),
            volume: market.volume_num,
         }));

         setMarkets(enrichedMarkets);

         const lRefreshTime = data.lastRefreshTime; 

         setLastRefreshTime(lRefreshTime);

      } catch (err) {
         setError(
            err instanceof Error
               ? err.message
               : 'Failed to fetch market details'
         );
         setMarkets([]);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      if (!autoFetch) return;

      if (marketIds && marketIds.length > 0) {
         // Create a stable string key from the sorted IDs to detect actual changes
         const idsKey = marketIds.slice().sort().join(',');

         // Only fetch if the IDs have actually changed
         if (idsKey !== lastFetchedIdsRef.current) {
            lastFetchedIdsRef.current = idsKey;
            fetchMarketDetails(marketIds);
         }
      } else if (tweetId) {
         const key = `tweet:${tweetId}`;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [tweetId, marketIds, q, qc, autoFetch]);

   return {
      markets,
      lastRefreshTime,
      loading,
      error,

      fetchMarketDetails,
      refetch: () => {
         if (marketIds && marketIds.length > 0) {
            return fetchMarketDetails(marketIds);
         }
      },
   };
}
