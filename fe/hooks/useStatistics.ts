import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { TweetStatistics } from '@/lib/types';

interface UseStatisticsOptions {
   autoFetch?: boolean;
}

export function useStatistics(options: UseStatisticsOptions = {}) {
   const { autoFetch = true } = options;
   const [statistics, setStatistics] = useState<TweetStatistics | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const fetchStatistics = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);

         const data = await api.getTweetStatistics();
         setStatistics(data);
      } catch (err) {
         setError(
            err instanceof Error ? err.message : 'Failed to fetch statistics'
         );
         setStatistics(null);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      if (autoFetch) {
         fetchStatistics();
      }
   }, [autoFetch, fetchStatistics]);

   return {
      statistics,
      loading,
      error,
      refetch: fetchStatistics,
   };
}
