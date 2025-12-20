'use client';

import { EnrichedTweet } from '@/lib/types';
import { TweetMarket } from './TweetMarket';

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
   const getSentimentInfo = (sentiment: string) => {
      const sentimentMap: Record<string, { label: string; color: string }> = {
         positive: { label: 'Bullish', color: 'green' },
         negative: { label: 'Bearish', color: 'red' },
         neutral: { label: 'Neutral', color: 'gray' },
      };
      return sentimentMap[sentiment] || sentimentMap.neutral;
   };

   const linkifyText = (text: string) => {
      // Regex to match URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = text.split(urlRegex);

      return parts.map((part, index) => {
         if (part.match(urlRegex)) {
            return (
               <a
                  key={index}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline">
                  {part}
               </a>
            );
         }
         return <span key={index}>{part}</span>;
      });
   };

   return (
      <div className="flex flex-col min-h-[500px] h-full bg-background-light dark:bg-background-dark">
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
         <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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

               return (
                  <div
                     key={tweet.tweetDetails.tweetId}
                     className="rounded-lg border border-[#e5e7eb] dark:border-border-dark bg-white dark:bg-surface-dark p-4 shadow-sm hover:shadow-md transition-shadow">
                     <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                           <div
                              className="size-6 bg-cover rounded-full bg-center"
                              style={{
                                 backgroundImage: `url("${tweet.tweetDetails.authorAvatarURL}")`,
                              }}></div>
                           <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                              @{tweet.tweetDetails.authorUsername}
                           </span>
                        </div>
                        <span
                           className={`inline-flex items-center rounded-md bg-${sentimentInfo.color}-500/10 px-2 py-1 text-xs font-bold text-${sentimentInfo.color}-500 ring-1 ring-inset ring-${sentimentInfo.color}-500/20 uppercase`}>
                           {sentimentInfo.label}
                        </span>
                     </div>
                     <p className="text-xs italic text-gray-600 dark:text-gray-400 mb-3 border-l-2 border-gray-300 dark:border-gray-600 pl-2 leading-relaxed">
                        &ldquo;{linkifyText(tweet.tweetDetails.text)}&rdquo;
                     </p>
                     <TweetMarket
                        tweetId={tweet.tweetDetails.tweetId}
                        confidence={confidence}
                     />
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
   );
}
