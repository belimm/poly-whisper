'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

export function usePolymarketProfile() {
   const { address, isConnected } = useAccount();
   const [loading, setLoading] = useState(false);
   const [exists, setExists] = useState<boolean | null>(null);

   useEffect(() => {
      if (!isConnected || !address) {
         setExists(null);
         return;
      }

      setLoading(true);

      fetch(`/api/polymarket/profile?address=${address}`)
         .then((res) => res.json())
         .then((data) => setExists(data.exists))
         .catch(() => setExists(false))
         .finally(() => setLoading(false));
   }, [address, isConnected]);

   return { exists, loading };
}
