'use client';

import { useCallback, useState } from 'react';
import Header from './Header';
import TheWire from './TheWire';
import TrendingMarkets from './TrendingMarkets';
import HotMarkets from './HotMarkets';
import IntelAnalysis from './IntelAnalysis';
import { useTweets } from '@/hooks/useTweets';
import { useWebSocket } from '@/hooks/useWebSocket';
import { EnrichedTweet } from '@/lib/types';
import TickerBanner from './TickerBanner';

export default function Dashboard() {
   const { tweets, loading, error, hasMore, loadMore, setTweets } = useTweets({
      limit: 15,
      autoFetch: true,
   });

   // Track hovered tweet ID across all components
   const [hoveredTweetId, setHoveredTweetId] = useState<string | null>(null);

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
      <div className="flex flex-col h-screen overflow-hidden">
         {/* Header - Fixed at top */}
         <div className="flex-shrink-0">
            <Header isConnected={isConnected} />
         </div>

         {/* Main Content Grid - Takes remaining space minus ticker height */}

         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#e5e7eb] dark:divide-border-dark overflow-hidden">
            <TheWire
               tweets={tweets}
               loading={loading}
               error={error}
               hasMore={hasMore}
               loadMore={loadMore}
               hoveredTweetId={hoveredTweetId}
               setHoveredTweetId={setHoveredTweetId}
            />
            <TrendingMarkets />
            <HotMarkets />
            <IntelAnalysis
               tweets={tweets}
               loading={loading}
               error={error}
               hasMore={hasMore}
               loadMore={loadMore}
               hoveredTweetId={hoveredTweetId}
               setHoveredTweetId={setHoveredTweetId}
            />
         </div>

         {/* Ticker Banner - Fixed at bottom, always visible */}
         <div className="flex-shrink-0">
            <TickerBanner />
         </div>
      </div>
   );
}
