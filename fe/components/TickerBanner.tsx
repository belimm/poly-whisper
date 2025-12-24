'use client';

import { useEffect, useState } from 'react';
import { useStatistics } from '@/hooks/useStatistics';

interface TickerItem {
   text: string;
   icon?: string;
}

const defaultTickerItems: TickerItem[] = [
   { text: 'Real-time market intelligence from Twitter', icon: '📊' },
   { text: 'Track trending crypto markets instantly', icon: '🔥' },
   { text: 'AI-powered sentiment analysis', icon: '💡' },
   { text: 'Live WebSocket updates', icon: '⚡' },
   { text: 'Discover hot market opportunities', icon: '🎯' },
   { text: 'Advanced market insights', icon: '📈' },
];

export default function TickerBanner() {
   const { statistics, loading } = useStatistics({ autoFetch: true });
   const [items, setItems] = useState<TickerItem[]>(defaultTickerItems);

   useEffect(() => {
      if (statistics && !loading) {
         const dynamicItems: TickerItem[] = [
            {
               text: `${statistics.total.toLocaleString()} tweets analyzed and counting`,
               icon: '📊',
            },
            {
               text: `${statistics.withAnalysis.toLocaleString()} market analyses completed`,
               icon: '💡',
            },
            {
               text: `${((statistics.withAnalysis / statistics.total) * 100).toFixed(1)}% analysis coverage`,
               icon: '📈',
            },
            { text: 'Real-time market intelligence', icon: '⚡' },
            { text: 'AI-powered sentiment tracking', icon: '🎯' },
            { text: 'Live WebSocket updates', icon: '🔥' },
         ];

         setItems(dynamicItems);
      }
   }, [statistics, loading]);

   return (
      <div className="w-full bg-[#1a1d29] dark:bg-[#0f1117] overflow-hidden border-t-2 border-gray-400/30 dark:border-gray-600/40">
         <div className="relative h-12 flex items-center">
            {/* First scroll instance */}
            <div className="animate-scroll flex items-center gap-8 px-4 whitespace-nowrap">
               {items.map((item, index) => (
                  <div
                     key={`first-${index}`}
                     className="flex items-center gap-2 text-gray-300 dark:text-gray-400 font-medium text-sm"
                  >
                     <span className="text-lg opacity-70">{item.icon}</span>
                     <span>{item.text}</span>
                     <span className="text-gray-500 dark:text-gray-600 ml-4">•</span>
                  </div>
               ))}
            </div>

            {/* Second scroll instance for seamless loop */}
            <div className="animate-scroll flex items-center gap-8 px-4 whitespace-nowrap absolute left-full">
               {items.map((item, index) => (
                  <div
                     key={`second-${index}`}
                     className="flex items-center gap-2 text-gray-300 dark:text-gray-400 font-medium text-sm"
                  >
                     <span className="text-lg opacity-70">{item.icon}</span>
                     <span>{item.text}</span>
                     <span className="text-gray-500 dark:text-gray-600 ml-4">•</span>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
}
