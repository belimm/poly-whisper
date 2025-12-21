'use client';

import { useMarkets } from "@/hooks/useMarkets";

interface TweetMarketProps {
   tweetId: string;
   confidence: number;
}

export function TweetMarket({ tweetId, confidence }: TweetMarketProps) {
   const { markets, loading, error } = useMarkets({
      tweetId,
      q: 1,
      qc: 1
   });

   const market = markets[0];

   if (loading) {
      return (
         <div className="bg-gray-50 dark:bg-black/20 p-2.5 rounded border border-dashed border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-1.5">
               <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-primary">
                     auto_awesome
                  </span>
                  <span className="text-[10px] uppercase text-gray-500 font-bold">
                     AI Prediction
                  </span>
               </div>
            </div>
            <p className="text-xs text-gray-500">Loading market...</p>
         </div>
      );
   }

   if (error || !market) {
      return (
         <div className="bg-gray-50 dark:bg-black/20 p-2.5 rounded border border-dashed border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-1.5">
               <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-primary">
                     auto_awesome
                  </span>
                  <span className="text-[10px] uppercase text-gray-500 font-bold">
                     AI Prediction
                  </span>
               </div>
            </div>
            <p className="text-xs text-gray-500">No market found</p>
         </div>
      );
   }

   const probabilityPercent = Math.round(market.probability * 100);
   const impactScore = market.volume > 1000000 ? 'High' : market.volume > 100000 ? 'Medium' : 'Low';
   const outcome = probabilityPercent > 60 ? 'YES' : probabilityPercent < 40 ? 'NO' : 'PENDING';
   const outcomeColor = probabilityPercent > 60 ? 'green' : probabilityPercent < 40 ? 'red' : 'gray';

   return (
      <div className="bg-gray-50 dark:bg-black/20 p-2.5 rounded border border-dashed border-gray-200 dark:border-gray-700">
         <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1">
               <span className="material-symbols-outlined text-[12px] text-primary">
                  auto_awesome
               </span>
               <span className="text-[10px] uppercase text-gray-500 font-bold">
                  AI Prediction
               </span>
            </div>
            <span className="text-[10px] text-primary font-mono">
               Confidence: {confidence}%
            </span>
         </div>
         <p className="text-sm font-bold text-[#111418] dark:text-white">
            {market.question}
         </p>
         <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-gray-500">
               Impact Score: {impactScore}
            </span>
            <span className={`text-${outcomeColor}-500 font-bold`}>
               {outcome}
            </span>
         </div>
      </div>
   );
}
