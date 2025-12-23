// components/PolymarketGate.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { PolymarketRequiredModal } from './PolymarketRequiredModal';

type GateStatus = 'checking' | 'allowed' | 'blocked';

// Separate component that handles the gate logic without affecting children
function GateLogic() {
   const { address, isConnected } = useAccount();
   const [gateStatus, setGateStatus] = useState<GateStatus>('checking');
   const abortControllerRef = useRef<AbortController | null>(null);

   useEffect(() => {
      // Cleanup previous request
      if (abortControllerRef.current) {
         abortControllerRef.current.abort();
      }

      if (!isConnected || !address) {
         setGateStatus('allowed');
         return;
      }

      setGateStatus('checking');
      const controller = new AbortController();
      abortControllerRef.current = controller;

      fetch(`/api/polymarket/profile?address=${address}`, {
         signal: controller.signal,
      })
         .then((res) => res.json())
         .then((data) => {
            if (!controller.signal.aborted) {
               setGateStatus(data.exists ? 'allowed' : 'blocked');
            }
         })
         .catch((error) => {
            if (error.name !== 'AbortError' && !controller.signal.aborted) {
               setGateStatus('blocked');
            }
         });

      return () => {
         controller.abort();
      };
   }, [address, isConnected]);

   if (gateStatus === 'checking') {
      return null;
   }

   if (gateStatus === 'blocked') {
      return <PolymarketRequiredModal />;
   }

   return null;
}

export function PolymarketGate({ children }: { children: React.ReactNode }) {
   return (
      <div className="h-full flex flex-col">
         <GateLogic />
         {children}
      </div>
   );
}
