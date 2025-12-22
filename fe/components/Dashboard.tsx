'use client';

import { useCallback } from 'react';
import Header from './Header';
import TheWire from './TheWire';
import TrendingMarkets from './TrendingMarkets';
import HotMarkets from './HotMarkets';
import IntelAnalysis from './IntelAnalysis';
import { useTweets } from '@/hooks/useTweets';
import { useWebSocket } from '@/hooks/useWebSocket';
import { EnrichedTweet } from '@/lib/types';

export default function Dashboard() {
   const { tweets, loading, error, hasMore, loadMore, setTweets } = useTweets({
      limit: 10,
      autoFetch: true,
   });

   // Handle new tweets from WebSocket
   const handleNewTweet = useCallback(
      (newTweet: EnrichedTweet) => {
         setTweets((prevTweets: EnrichedTweet[]) => {
            // Check if tweet already exists to avoid duplicates
            const exists = prevTweets.some(
               (tweet: EnrichedTweet) =>
                  tweet.tweetDetails.tweetId === newTweet.tweetDetails.tweetId
            );
            if (exists) return prevTweets;

            // Add new tweet to the beginning of the list
            return [newTweet, ...prevTweets];
         });
      },
      [setTweets]
   );

   // Connect to WebSocket
   const { isConnected } = useWebSocket({
      onNewTweet: handleNewTweet,
      enabled: true,
   });

   return (
      <div className="flex flex-col h-full">
         <Header isConnected={isConnected} />
         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 min-h-0 divide-y md:divide-y-0 md:divide-x divide-[#e5e7eb] dark:divide-border-dark overflow-y-auto md:overflow-hidden">
            <TheWire
               tweets={tweets}
               loading={loading}
               error={error}
               hasMore={hasMore}
               loadMore={loadMore}
            />
            <TrendingMarkets />
            <HotMarkets />
            <IntelAnalysis
               tweets={tweets}
               loading={loading}
               error={error}
               hasMore={hasMore}
               loadMore={loadMore}
            />
         </div>
      </div>
   );
}
