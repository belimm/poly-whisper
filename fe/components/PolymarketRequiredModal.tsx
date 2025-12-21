// components/PolymarketRequiredModal.tsx
'use client';

import { useAccount, useDisconnect } from 'wagmi';

export function PolymarketRequiredModal() {
   const { address } = useAccount();
   const { disconnect } = useDisconnect();

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
         <div className="w-[420px] rounded-xl bg-[#0b0f14] border border-white/10 p-6 text-white">
            <h2 className="text-lg font-bold mb-3">
               Polymarket Profile Required
            </h2>

            <p className="text-sm text-gray-400 mb-4">
               To use Whisper, you need to create a Polymarket profile first.
            </p>

            <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300 mb-4">
               <ol className="list-decimal ml-4 space-y-1">
                  <li>Go to Polymarket</li>
                  <li>Connect the same wallet</li>
                  <li>Create your username</li>
                  <li>Come back and click “I’ve Created My Profile”</li>
               </ol>
            </div>

            <p className="text-xs text-gray-500 mb-4">
               Connected wallet: {address?.slice(0, 6)}…{address?.slice(-4)}
            </p>

            <div className="space-y-2">
               <a
                  href="https://polymarket.com"
                  target="_blank"
                  className="block w-full text-center rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 font-semibold">
                  Go to Polymarket
               </a>

               <button
                  onClick={() => window.location.reload()}
                  className="w-full rounded-lg border border-white/10 py-2">
                  I’ve Created My Profile
               </button>

               <button
                  onClick={() => disconnect()}
                  className="w-full text-sm text-gray-400 hover:text-white">
                  Disconnect Wallet
               </button>
            </div>
         </div>
      </div>
   );
}
