'use client';

import { useState, useEffect } from 'react';
import { EnrichedTweet } from '@/lib/types';
import MobileSection from './MobileSection';
import TweetDetailModal from './TweetDetailModal';

interface IntelAnalysisProps {
   tweets: EnrichedTweet[];
   loading: boolean;
   error: string | null;
   hasMore: boolean;
   loadMore: () => void;
}

export default function IntelAnalysis({
   tweets,
   loading,
   error,
   hasMore,
   loadMore,
}: IntelAnalysisProps) {
   const [visibleCount, setVisibleCount] = useState(5)
   const [isMobile, setIsMobile] = useState(false)
   const [isMounted, setIsMounted] = useState(false)
   const [selectedTweet, setSelectedTweet] = useState<EnrichedTweet | null>(null)

   useEffect(() => {
      setIsMounted(true)
      const checkMobile = () => {
         setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
   }, [])

   const displayedTweets = isMounted && isMobile ? tweets.slice(0, visibleCount) : tweets
   const showLoadMore = isMounted && isMobile ? (visibleCount < tweets.length || hasMore) : hasMore

   const handleLoadMore = () => {
      if (isMobile && visibleCount < tweets.length) {
         setVisibleCount(prev => prev + 5)
      } else {
         loadMore()
      }
   };

   const handleCardClick = (tweet: EnrichedTweet) => {
      setSelectedTweet(tweet);
   };

   const handleCloseModal = () => {
      setSelectedTweet(null);
   };

   const getSentimentInfo = (sentiment: string) => {
      const sentimentMap: Record<string, { label: string; color: string; bgColor: string; textColor: string }> = {
         positive: { 
            label: 'BULLISH', 
            color: 'green',
            bgColor: 'bg-green-500/10',
            textColor: 'text-green-500'
         },
         negative: { 
            label: 'BEARISH', 
            color: 'red',
            bgColor: 'bg-red-500/10',
            textColor: 'text-red-500'
         },
         neutral: { 
            label: 'NEUTRAL', 
            color: 'gray',
            bgColor: 'bg-gray-500/10',
            textColor: 'text-gray-500'
         },
      };
      return sentimentMap[sentiment] || sentimentMap.neutral;
   };

   const getMarketLean = (sentiment: string, confidence: number) => {
      if (confidence < 40) {
         return { label: 'UNCERTAIN', color: 'text-gray-500' };
      }
      
      if (sentiment === 'positive') {
         return { label: 'YES LEAN', color: 'text-green-500' };
      } else if (sentiment === 'negative') {
         return { label: 'NO LEAN', color: 'text-red-500' };
      }
      
      return { label: 'UNCERTAIN', color: 'text-gray-500' };
   };

   const generateMarketImplication = (tweet: EnrichedTweet) => {
      const sentiment = tweet.analysis.sentiment;
      const keywords = tweet.analysis.keywords.slice(0, 2).join(' and ');
      
      if (sentiment === 'positive') {
         return `Strong positive signal for ${keywords || 'related markets'}. ${tweet.analysis.categories[0] || 'Market'} sentiment historically correlates with potential price increases.`;
      } else if (sentiment === 'negative') {
         return `Concerns about ${keywords || 'market conditions'} detected. Whale alert volume suggests potential short-term pullback on approval odds.`;
      }
      
      return `Ambiguous statement regarding ${keywords || 'market conditions'}. No clear directional signal for ${tweet.analysis.categories[0] || 'related'} markets yet.`;
   };

   return (
      <>
         {/* Tweet Detail Modal */}
         {selectedTweet && (
            <TweetDetailModal 
               tweet={selectedTweet} 
               onClose={handleCloseModal} 
            />
         )}

         <div className="flex flex-col h-full min-h-0">
            {/* Mobile Version with Accordion */}
         <div className="flex flex-col h-full min-h-0 bg-background-light dark:bg-background-dark md:hidden">
            <MobileSection
               title="Intel & Analysis"
               icon="psychology">
               <div className="p-4 flex flex-col gap-4">
                  {loading && tweets.length === 0 && (
                     <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Loading tweets...</p>
                     </div>
                  )}

                  {error && (
                     <div className="flex items-center justify-center h-full">
                        <p className="text-red-500">Error: {error}</p>
                     </div>
                  )}

                  {!loading && !error && tweets.length === 0 && (
                     <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No tweets found</p>
                     </div>
                  )}

                  {displayedTweets.map((tweet) => {
                     const sentimentInfo = getSentimentInfo(tweet.analysis.sentiment);
                     const confidence = Math.round(
                        tweet.analysis.sentimentScore * 100
                     );
                     const marketLean = getMarketLean(tweet.analysis.sentiment, confidence);
                     const implication = generateMarketImplication(tweet);

                     return (
                        <div
                           key={tweet.tweetDetails.tweetId}
                           onClick={() => handleCardClick(tweet)}
                           className="rounded-lg border border-[#e5e7eb] dark:border-[#2a3745] bg-[#0f1419] p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer">
                           {/* Header */}
                           <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-gray-400">
                                 Ref: @{tweet.tweetDetails.authorUsername}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-800 px-2 py-0.5 rounded">
                                 TWEET
                              </span>
                           </div>

                           {/* Sentiment Analysis */}
                           <div className="mb-4">
                              <h4 className="text-xs font-bold text-white mb-2">
                                 Sentiment Analysis
                              </h4>
                              <div className="flex items-center justify-between">
                                 <span className={`text-xs font-bold ${sentimentInfo.textColor} uppercase`}>
                                    {sentimentInfo.label}
                                 </span>
                                 <span className="text-[10px] text-gray-500">
                                    • {confidence < 50 ? 'Low' : confidence < 75 ? 'Med' : 'High'} Confidence ({confidence}%)
                                 </span>
                              </div>
                           </div>

                           {/* Market Implication */}
                           <div>
                              <div className="flex items-center justify-between mb-2">
                                 <h4 className="text-xs font-bold text-white">
                                    Market Implication
                                 </h4>
                                 <span className={`text-xs font-bold ${marketLean.color} uppercase`}>
                                    {marketLean.label}
                                 </span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                 {implication}
                              </p>
                           </div>
                        </div>
                     );
                  })}

                  {showLoadMore && !loading && (
                     <button
                        onClick={handleLoadMore}
                        className="mt-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors">
                        Load More
                     </button>
                  )}

                  {loading && tweets.length > 0 && (
                     <div className="flex items-center justify-center py-4">
                        <p className="text-gray-500 text-sm">Loading more...</p>
                     </div>
                  )}
               </div>
            </MobileSection>
         </div>

         {/* Desktop Version */}
         <div className="hidden md:flex flex-col max-h-full min-h-0 bg-background-light dark:bg-background-dark overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark border-b border-[#e5e7eb] dark:border-border-dark">
               <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                     psychology
                  </span>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-[#111418] dark:text-gray-100">
                     Intel & Analysis
                  </h3>
               </div>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-4">
               {loading && tweets.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                     <p className="text-gray-500">Loading tweets...</p>
                  </div>
               )}

               {error && (
                  <div className="flex items-center justify-center h-full">
                     <p className="text-red-500">Error: {error}</p>
                  </div>
               )}

               {!loading && !error && tweets.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                     <p className="text-gray-500">No tweets found</p>
                  </div>
               )}

               {tweets.map((tweet) => {
                  const sentimentInfo = getSentimentInfo(tweet.analysis.sentiment);
                  const confidence = Math.round(
                     tweet.analysis.sentimentScore * 100
                  );
                  const marketLean = getMarketLean(tweet.analysis.sentiment, confidence);
                  const implication = generateMarketImplication(tweet);

                  return (
                     <div
                        key={tweet.tweetDetails.tweetId}
                        onClick={() => handleCardClick(tweet)}
                        className="rounded-lg border border-[#e5e7eb] dark:border-[#2a3745] bg-[#0f1419] p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-xs text-gray-400">
                              Ref: @{tweet.tweetDetails.authorUsername}
                           </span>
                           <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-800 px-2 py-0.5 rounded">
                              TWEET
                           </span>
                        </div>

                        {/* Sentiment Analysis */}
                        <div className="mb-4">
                           <h4 className="text-xs font-bold text-white mb-2">
                              Sentiment Analysis
                           </h4>
                           <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${sentimentInfo.textColor} uppercase`}>
                                 {sentimentInfo.label}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                 • {confidence < 50 ? 'Low' : confidence < 75 ? 'Med' : 'High'} Confidence ({confidence}%)
                              </span>
                           </div>
                        </div>

                        {/* Market Implication */}
                        <div>
                           <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-white">
                                 Market Implication
                              </h4>
                              <span className={`text-xs font-bold ${marketLean.color} uppercase`}>
                                 {marketLean.label}
                              </span>
                           </div>
                           <p className="text-xs text-gray-400 leading-relaxed">
                              {implication}
                           </p>
                        </div>
                     </div>
                  );
               })}

               {hasMore && !loading && (
                  <button
                     onClick={loadMore}
                     className="mt-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors">
                     Load More
                  </button>
               )}

               {loading && tweets.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                     <p className="text-gray-500 text-sm">Loading more...</p>
                  </div>
               )}
            </div>
         </div>
         </div>
      </>
   );
}
