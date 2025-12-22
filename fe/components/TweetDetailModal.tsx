'use client';

import { useEffect } from 'react';
import { EnrichedTweet } from '@/lib/types';
import { useMarkets } from '@/hooks/useMarkets';

interface TweetDetailModalProps {
   tweet: EnrichedTweet;
   onClose: () => void;
}

export default function TweetDetailModal({ tweet, onClose }: TweetDetailModalProps) {
   const { markets } = useMarkets({
      tweetId: tweet.tweetDetails.tweetId,
      q: 1,
      qc: 1
   });

   const market = markets[0];

   // ESC key to close
   useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
         if (e.key === 'Escape') {
            onClose();
         }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
   }, [onClose]);

   // Prevent body scroll when modal is open
   useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
         document.body.style.overflow = 'unset';
      };
   }, []);

   const getSentimentResult = (sentiment: string, score: number) => {
      if (score >= 0.8) {
         return sentiment === 'positive' ? 'VERY_BULLISH' : 'VERY_BEARISH';
      } else if (score >= 0.6) {
         return sentiment === 'positive' ? 'BULLISH' : 'BEARISH';
      }
      return 'NEUTRAL';
   };

   const sentimentResult = getSentimentResult(tweet.analysis.sentiment, tweet.analysis.sentimentScore);
   const sentimentColor = tweet.analysis.sentiment === 'positive' ? 'text-green-400' : 
                          tweet.analysis.sentiment === 'negative' ? 'text-red-400' : 'text-gray-400';

   const confidencePercent = Math.round(tweet.analysis.sentimentScore * 100);

   const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toISOString().replace('T', ' ').split('.')[0] + ' UTC';
   };

   return (
      <>
         {/* Modal Overlay */}
         <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
            onClick={onClose}>
            {/* Modal Container */}
            <div 
               className="w-full max-w-[840px] bg-surface-dark rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200"
               onClick={(e) => e.stopPropagation()}>
               {/* Header Bar */}
               <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-background-dark/80">
                  <div className="flex items-center gap-2 text-sm overflow-hidden whitespace-nowrap">
                     <span className="text-gray-500 font-medium">Whisper</span>
                     <span className="text-gray-600">/</span>
                     <span className="text-gray-500 font-medium hover:text-gray-300 cursor-pointer transition-colors">signals</span>
                     <span className="text-gray-600">/</span>
                     <div className="flex items-center gap-2 bg-primary/10 px-2 py-0.5 rounded text-primary border border-primary/20">
                        <span className="material-symbols-outlined text-[16px]">tag</span>
                        <span className="font-bold tracking-wide text-xs">tweet_{tweet.tweetDetails.tweetId.slice(-6)}</span>
                     </div>
                  </div>
                  <button 
                     onClick={onClose}
                     aria-label="Close modal" 
                     className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors group">
                     <span className="material-symbols-outlined text-[20px] font-bold">close</span>
                  </button>
               </div>

               {/* Modal Content Scroll Area */}
               <div className="overflow-y-auto custom-scrollbar flex flex-col">
                  <div className="p-6 md:p-8 flex flex-col gap-8">
                     {/* User Metadata & Tweet */}
                     <div className="flex flex-col gap-5">
                        <div className="flex items-start justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div 
                                 className="h-14 w-14 rounded-full bg-cover bg-center border-2 border-gray-700 shrink-0 shadow-lg" 
                                 style={{ backgroundImage: `url('${tweet.tweetDetails.authorAvatarURL}')` }}></div>
                              <div className="flex flex-col">
                                 <div className="flex items-center gap-2">
                                    <h2 className="text-white text-lg font-bold leading-tight">{tweet.tweetDetails.authorName}</h2>
                                    <span className="material-symbols-outlined text-primary text-[18px]" title="Verified">verified</span>
                                 </div>
                                 <p className="text-gray-400 text-sm">@{tweet.tweetDetails.authorUsername}</p>
                              </div>
                           </div>
                           <div className="text-right hidden sm:block">
                              <div className="flex items-center justify-end gap-1.5 text-gray-500 mb-0.5">
                                 <span className="material-symbols-outlined text-[14px]">schedule</span>
                                 <p className="text-xs font-mono tracking-wider uppercase">Received</p>
                              </div>
                              <p className="text-gray-300 text-sm font-medium font-mono">{formatDate(tweet.tweetDetails.createdAt)}</p>
                           </div>
                        </div>

                        {/* Content */}
                        <div className="text-white text-xl md:text-2xl font-medium leading-relaxed">
                           {tweet.tweetDetails.text}
                        </div>

                        {/* Engagement Metrics */}
                        <div className="flex flex-wrap gap-4 pt-2 border-b border-gray-800/50 pb-6">
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group">
                              <span className="material-symbols-outlined text-gray-500 group-hover:text-pink-500 transition-colors text-[20px]">favorite</span>
                              <span className="text-gray-300 font-mono text-sm font-bold">{tweet.tweetDetails.likeCount || '0'}</span>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group">
                              <span className="material-symbols-outlined text-gray-500 group-hover:text-green-500 transition-colors text-[20px]">repeat</span>
                              <span className="text-gray-300 font-mono text-sm font-bold">{tweet.tweetDetails.retweetCount || '0'}</span>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group">
                              <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors text-[20px]">chat_bubble</span>
                              <span className="text-gray-300 font-mono text-sm font-bold">{tweet.tweetDetails.replyCount || '0'}</span>
                           </div>
                           <a 
                              href={tweet.tweetDetails.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group ml-auto">
                              <span className="material-symbols-outlined text-gray-500 group-hover:text-white transition-colors text-[20px]">ios_share</span>
                           </a>
                        </div>
                     </div>

                     {/* Layout: Analysis & Market */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sentiment Terminal */}
                        <div className="flex flex-col gap-3">
                           <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold px-1">
                              <span className="material-symbols-outlined text-[16px]">terminal</span>
                              NLP Analysis Engine
                           </div>
                           <div className="bg-terminal-bg rounded-lg border border-gray-800 p-5 font-mono text-sm flex flex-col gap-4 shadow-inner h-full relative overflow-hidden group">
                              {/* Decorative header line */}
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-20"></div>
                              
                              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                                 <span className="text-gray-500 text-xs">./sentiment_v4.py</span>
                                 <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                    <span className="text-green-500 text-xs font-bold tracking-wider">PROCESSED</span>
                                 </div>
                              </div>

                              <div className="space-y-2 text-gray-400 leading-relaxed">
                                 <div className="flex gap-2">
                                    <span className="text-gray-600 select-none">&gt;</span>
                                    <p>Running entity_extraction...</p>
                                 </div>
                                 <div className="flex gap-2">
                                    <span className="text-gray-600 select-none">&gt;</span>
                                    <p>Detected: 
                                       {tweet.analysis.keywords.slice(0, 2).map((keyword, idx) => (
                                          <span key={idx}> <span className="text-primary">"{keyword}"</span>{idx < 1 && tweet.analysis.keywords.length > 1 ? ',' : ''}</span>
                                       ))}
                                    </p>
                                 </div>
                                 <div className="flex gap-2">
                                    <span className="text-gray-600 select-none">&gt;</span>
                                    <p>Calculating sentiment score...</p>
                                 </div>

                                 <div className="my-4 p-3 bg-white/5 rounded border-l-2 border-primary">
                                    <div className="flex justify-between items-center mb-1">
                                       <span className="text-gray-500 text-xs uppercase">Confidence Score</span>
                                       <span className="text-primary font-bold">{(tweet.analysis.sentimentScore).toFixed(2)}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                       <div className="bg-primary h-full rounded-full" style={{ width: `${confidencePercent}%` }}></div>
                                    </div>
                                    <p className="mt-2 text-white font-bold tracking-wide">
                                       RESULT: <span className={sentimentColor}>{sentimentResult}</span>
                                    </p>
                                 </div>

                                 <div className="flex gap-2">
                                    <span className="text-gray-600 select-none">&gt;</span>
                                    <p>Key drivers: 
                                       {tweet.analysis.keywords.slice(0, 2).map((keyword, idx) => (
                                          <span key={idx}> <span className="text-gray-300">"{keyword}"</span>{idx < 1 && tweet.analysis.keywords.length > 1 ? ',' : ''}</span>
                                       ))}
                                    </p>
                                 </div>
                              </div>

                              <div className="mt-auto pt-2 text-xs text-gray-600">
                                 <span className="inline-block w-2.5 h-4 bg-primary/50 align-middle animate-pulse"></span>
                              </div>
                           </div>
                        </div>

                        {/* Market Action Card */}
                        {market && (
                           <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold px-1">
                                 <span className="material-symbols-outlined text-[16px]">candlestick_chart</span>
                                 Associated Market
                              </div>
                              <div className="bg-surface-dark rounded-lg border border-gray-700 p-0 flex flex-col h-full overflow-hidden hover:border-gray-500 transition-colors shadow-lg group">
                                 {/* Market Header with Image */}
                                 <div className="relative h-28 w-full bg-gray-800 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/60 to-transparent"></div>
                                    <div className="absolute bottom-3 left-4 right-4">
                                       <div className="flex items-center gap-2 mb-1">
                                          <span className="px-1.5 py-0.5 rounded bg-gray-800/80 text-[10px] uppercase font-bold text-gray-300 border border-gray-600 backdrop-blur-sm">
                                             Market
                                          </span>
                                          <span className="text-gray-400 text-xs">
                                             Vol: ${(market.volume / 1000000).toFixed(1)}M
                                          </span>
                                       </div>
                                       <p className="text-white font-bold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                          {market.question}
                                       </p>
                                    </div>
                                 </div>

                                 {/* Odds */}
                                 <div className="p-5 flex-1 flex flex-col justify-between gap-5 bg-gradient-to-b from-surface-dark to-background-dark">
                                    <div className="grid grid-cols-2 gap-3">
                                       <div className="flex flex-col items-center justify-center bg-green-500/5 border border-green-500/20 rounded-lg p-2.5 hover:bg-green-500/10 transition-colors cursor-pointer">
                                          <span className="text-green-500 text-xs font-bold uppercase mb-1">Yes (Win)</span>
                                          <span className="text-white text-2xl font-bold">{Math.round(market.probability * 100)}¢</span>
                                          <span className="text-green-500/50 text-[10px] font-mono">↑ 2.4%</span>
                                       </div>
                                       <div className="flex flex-col items-center justify-center bg-red-500/5 border border-red-500/20 rounded-lg p-2.5 hover:bg-red-500/10 transition-colors cursor-pointer">
                                          <span className="text-red-500 text-xs font-bold uppercase mb-1">No (Lose)</span>
                                          <span className="text-gray-300 text-2xl font-bold">{Math.round((1 - market.probability) * 100)}¢</span>
                                          <span className="text-red-500/50 text-[10px] font-mono">↓ 2.4%</span>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Footer Hint */}
                  <div className="mt-auto px-6 py-3 bg-background-dark/50 border-t border-gray-800 flex justify-between items-center text-xs">
                     <span className="text-gray-600 font-mono">System Status: <span className="text-green-500">ONLINE</span></span>
                     <span className="text-gray-500 font-mono flex items-center gap-1">
                        <span className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">ESC</span> to close
                     </span>
                  </div>
               </div>
            </div>
         </div>
      </>
   );
}

