'use client';

import { EnrichedTweet } from "@/lib/types";

interface IntelAnalysisProps {
   tweets: EnrichedTweet[]
   loading: boolean
   error: string | null
   hasMore: boolean
   loadMore: () => void
}

export default function IntelAnalysis({ tweets, loading, error, hasMore, loadMore }: IntelAnalysisProps) {

   // Generate dummy analysis for a tweet
   const getDummyAnalysis = (tweet: EnrichedTweet) => {
      const sentiments = ['Bullish', 'Bearish', 'Neutral'];
      const sentimentColors = ['green', 'red', 'gray'];
      const predictions = [
         'Bitcoin > $100K by Q2',
         'ETH L2s will dominate',
         'Polymarket volume to surge',
         'Crypto regulation tightens',
         'DeFi TVL reaches $200B'
      ];
      const confidences = ['94%', '88%', '76%', '82%', '91%'];
      const impactScores = ['High', 'Medium', 'Low'];
      const outcomes = ['YES', 'NO', 'PENDING'];

      // Use tweet ID to generate consistent dummy data for each tweet
      const seedIndex = parseInt(tweet.tweetDetails.tweetId.slice(-1), 16) || 0;
      const sentimentIndex = seedIndex % sentiments.length;

      return {
         sentiment: sentiments[sentimentIndex],
         sentimentColor: sentimentColors[sentimentIndex],
         prediction: predictions[seedIndex % predictions.length],
         confidence: confidences[seedIndex % confidences.length],
         impactScore: impactScores[seedIndex % impactScores.length],
         outcome: outcomes[seedIndex % outcomes.length],
         outcomeColor: sentimentColors[seedIndex % sentiments.length],
      };
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
               const analysis = getDummyAnalysis(tweet);
               return (
                  <div
                     key={tweet.id}
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
                           className={`inline-flex items-center rounded-md bg-${analysis.sentimentColor}-500/10 px-2 py-1 text-xs font-bold text-${analysis.sentimentColor}-500 ring-1 ring-inset ring-${analysis.sentimentColor}-500/20 uppercase`}>
                           {analysis.sentiment}
                        </span>
                     </div>
                     <p className="text-xs italic text-gray-600 dark:text-gray-400 mb-3 border-l-2 border-gray-300 dark:border-gray-600 pl-2 leading-relaxed">
                        &ldquo;{linkifyText(tweet.tweetDetails.text)}&rdquo;
                     </p>
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
                              Confidence: {analysis.confidence}
                           </span>
                        </div>
                        <p className="text-sm font-bold text-[#111418] dark:text-white">
                           {analysis.prediction}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                           <span className="text-gray-500">
                              Impact Score: {analysis.impactScore}
                           </span>
                           <span
                              className={`text-${analysis.outcomeColor}-500 font-bold`}>
                              {analysis.outcome}
                           </span>
                        </div>
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
   );
}
