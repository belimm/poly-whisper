// components/PolymarketGate.tsx
'use client';

import { useAccount } from 'wagmi';
import { usePolymarketProfile } from '@/hooks/usePolyMarketProfile';
import { PolymarketRequiredModal } from './PolymarketRequiredModal';

export function PolymarketGate({ children }: { children: React.ReactNode }) {
   const { isConnected } = useAccount();
   const { exists, loading } = usePolymarketProfile();

   // Wallet not connected → allow normal UI
   if (!isConnected) {
      return <div className="h-full flex flex-col">{children}</div>;
   }

   // Still checking → block silently (no flash)
   if (loading || exists === null) {
      return null;
   }

   // Connected but no Polymarket profile → BLOCK
   if (exists === false) {
      return <PolymarketRequiredModal />;
   }

   // Connected + profile exists → allow app
   return <div className="h-full flex flex-col">{children}</div>;
}
