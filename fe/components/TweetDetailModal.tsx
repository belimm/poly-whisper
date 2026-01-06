'use client';

import { useEffect, useMemo, useState } from 'react';
import { EnrichedTweet } from '@/lib/types';
import { useMarkets } from '@/hooks/useMarkets';

interface TweetDetailModalProps {
   tweet: EnrichedTweet;
   onClose: () => void;
}

export default function TweetDetailModal({
   tweet,
   onClose,
}: TweetDetailModalProps) {
   // Extract market IDs from tweet.markets if available - memoized to prevent infinite loops
   const marketIds = useMemo(
      () => tweet.markets?.map((m) => m.market.id) || [],
      [tweet.markets]
   );

   const { markets, lastRefreshTime } = useMarkets({
      marketIds: marketIds.length > 0 ? marketIds : undefined,
      tweetId: marketIds.length === 0 ? tweet.tweetDetails.tweetId : undefined,
      q: 1,
      qc: 1,
   });

   // Carousel state
   const [currentMarketIndex, setCurrentMarketIndex] = useState(0);

   const market = markets[currentMarketIndex] || markets[0];
   const hasMultipleMarkets = markets.length > 1;

   // Navigation handlers
   const goToNextMarket = () => {
      setCurrentMarketIndex((prev) => (prev + 1) % markets.length);
   };

   const goToPrevMarket = () => {
      setCurrentMarketIndex((prev) => (prev - 1 + markets.length) % markets.length);
   };

   // Parse outcomes and outcome prices
   const parsedOutcomes = market
      ? (() => {
           try {
              const outcomes = JSON.parse(market.outcomes) as string[];
              const prices = JSON.parse(market.outcome_prices) as string[];
              return outcomes.map((outcome, idx) => ({
                 name: outcome,
                 price: parseFloat(prices[idx] || '0'),
              }));
           } catch {
              return [];
           }
        })()
      : [];

   const yesOutcome = parsedOutcomes.find((o) => o.name === 'Yes');
   const noOutcome = parsedOutcomes.find((o) => o.name === 'No');

   console.log(yesOutcome);

   console.log(noOutcome);
   // Format time ago helper
   const getTimeAgo = (timestamp: string) => {
      if (!timestamp) return 'recently';
      const now = new Date();
      const past = new Date(timestamp);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
   };

   // Format number with appropriate significant digits
   const formatSignificantNumber = (num: number) => {
      const absNum = Math.abs(num);

      if (absNum === 0) return '0';

      // For numbers >= 1, show appropriate decimal places
      if (absNum >= 10) return absNum.toFixed(1);
      if (absNum >= 1) return absNum.toFixed(2);

      // For numbers < 1, remove trailing zeros
      if (absNum >= 0.01) {
         const formatted = absNum.toFixed(2);
         return formatted.replace(/\.?0+$/, '');
      }

      if (absNum >= 0.001) {
         const formatted = absNum.toFixed(3);
         return formatted.replace(/\.?0+$/, '');
      }

      return absNum.toFixed(4).replace(/\.?0+$/, '');
   };

   // Keyboard navigation (ESC to close, Arrow keys for carousel)
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'Escape') {
            onClose();
         } else if (hasMultipleMarkets) {
            if (e.key === 'ArrowRight') {
               e.preventDefault();
               goToNextMarket();
            } else if (e.key === 'ArrowLeft') {
               e.preventDefault();
               goToPrevMarket();
            }
         }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [onClose, hasMultipleMarkets, goToNextMarket, goToPrevMarket]);

   // Prevent body scroll when modal is open
   useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
         document.body.style.overflow = 'unset';
      };
   }, []);

   const getSentimentResult = (sentiment: string) => {
      const sentimentMap: Record<string, string> = {
         positive: 'BULLISH',
         negative: 'BEARISH',
         neutral: 'NEUTRAL',
      };
      return sentimentMap[sentiment] || 'NEUTRAL';
   };

   const sentimentResult = getSentimentResult(tweet.analysis.sentiment);
   const sentimentColor =
      tweet.analysis.sentiment === 'positive'
         ? 'text-green-400'
         : tweet.analysis.sentiment === 'negative'
         ? 'text-red-400'
         : 'text-gray-400';

   const confidencePercent = Math.round(tweet.analysis.sentiment_score * 100);

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
                     <span className="text-gray-500 font-medium hover:text-gray-300 cursor-pointer transition-colors">
                        signals
                     </span>
                     <span className="text-gray-600">/</span>
                     <div className="flex items-center gap-2 bg-primary/10 px-2 py-0.5 rounded text-primary border border-primary/20">
                        <span className="material-symbols-outlined text-[16px]">
                           tag
                        </span>
                        <span className="font-bold tracking-wide text-xs">
                           tweet_{tweet.tweetDetails.tweetId.slice(-6)}
                        </span>
                     </div>
                  </div>
                  <button
                     onClick={onClose}
                     aria-label="Close modal"
                     className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors group">
                     <span className="material-symbols-outlined text-[20px] font-bold">
                        close
                     </span>
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
                                 style={{
                                    backgroundImage: `url('${tweet.tweetDetails.authorAvatarURL}')`,
                                 }}></div>
                              <div className="flex flex-col">
                                 <div className="flex items-center gap-2">
                                    <h2 className="text-white text-lg font-bold leading-tight">
                                       {tweet.tweetDetails.authorName}
                                    </h2>
                                    <span
                                       className="material-symbols-outlined text-primary text-[18px]"
                                       title="Verified">
                                       verified
                                    </span>
                                 </div>
                                 <p className="text-gray-400 text-sm">
                                    @{tweet.tweetDetails.authorUsername}
                                 </p>
                              </div>
                           </div>
                           <div className="text-right hidden sm:block">
                              <div className="flex items-center justify-end gap-1.5 text-gray-500 mb-0.5">
                                 <span className="material-symbols-outlined text-[14px]">
                                    schedule
                                 </span>
                                 <p className="text-xs font-mono tracking-wider uppercase">
                                    Received
                                 </p>
                              </div>
                              <p className="text-gray-300 text-sm font-medium font-mono">
                                 {formatDate(tweet.tweetDetails.createdAt)}
                              </p>
                           </div>
                        </div>

                        {/* Content */}
                        <div className="text-white text-xl md:text-2xl font-medium leading-relaxed">
                           {tweet.tweetDetails.text}
                        </div>
                        <a
                           href={`https://x.com/${tweet.tweetDetails.authorUsername}/status/${tweet.tweetDetails.tweetId}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group ml-auto">
                           <span className="material-symbols-outlined text-gray-500 group-hover:text-white transition-colors text-[20px]">
                              ios_share
                           </span>
                        </a>
                        {/* Engagement Metrics */}
                        {/* <div className="flex flex-wrap gap-4 pt-2 border-b border-gray-800/50 pb-6">
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group">
                              <span className="material-symbols-outlined text-gray-500 group-hover:text-pink-500 transition-colors text-[20px]">
                                 favorite
                              </span>
                              <span className="text-gray-300 font-mono text-sm font-bold">
                                 {tweet.tweetDetails.likeCount || '0'}
                              </span>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group">
                              <span className="material-symbols-outlined text-gray-500 group-hover:text-green-500 transition-colors text-[20px]">
                                 repeat
                              </span>
                              <span className="text-gray-300 font-mono text-sm font-bold">
                                 {tweet.tweetDetails.retweetCount || '0'}
                              </span>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group">
                              <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors text-[20px]">
                                 chat_bubble
                              </span>
                              <span className="text-gray-300 font-mono text-sm font-bold">
                                 {tweet.tweetDetails.replyCount || '0'}
                              </span>
                           </div>
                           <a
                              href={tweet.tweetDetails.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group ml-auto">
                              <span className="material-symbols-outlined text-gray-500 group-hover:text-white transition-colors text-[20px]">
                                 ios_share
                              </span>
                           </a>
                        </div> */}
                     </div>

                     {/* Layout: Analysis & Market */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sentiment Terminal */}
                        <div className="flex flex-col gap-3">
                           <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold px-1">
                              <span className="material-symbols-outlined text-[16px]">
                                 terminal
                              </span>
                              NLP Analysis Engine
                           </div>
                           <div className="bg-terminal-bg rounded-lg border border-gray-800 p-5 font-mono text-sm flex flex-col gap-4 shadow-inner h-full relative overflow-hidden group">
                              {/* Decorative header line */}
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-20"></div>

                              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                                 <span className="text-gray-500 text-xs">
                                    ./sentiment_v4.py
                                 </span>
                                 <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                    <span className="text-green-500 text-xs font-bold tracking-wider">
                                       PROCESSED
                                    </span>
                                 </div>
                              </div>

                              <div className="space-y-2 text-gray-400 leading-relaxed">
                                 <div className="flex gap-2">
                                    <span className="text-gray-600 select-none">
                                       &gt;
                                    </span>
                                    <p>Running entity_extraction...</p>
                                 </div>
                                 <div className="flex gap-2">
                                    <span className="text-gray-600 select-none">
                                       &gt;
                                    </span>
                                    <p>
                                       Detected:
                                       {tweet.analysis.keywords
                                          .slice(0, 2)
                                          .map((keyword, idx) => (
                                             <span key={idx}>
                                                {' '}
                                                <span className="text-primary">
                                                   &quot;{keyword}&quot;
                                                </span>
                                                {idx < 1 &&
                                                tweet.analysis.keywords.length >
                                                   1
                                                   ? ','
                                                   : ''}
                                             </span>
                                          ))}
                                    </p>
                                 </div>
                                 <div className="flex gap-2">
                                    <span className="text-gray-600 select-none">
                                       &gt;
                                    </span>
                                    <p>Calculating sentiment score...</p>
                                 </div>

                                 <div className="my-4 p-3 bg-white/5 rounded border-l-2 border-primary">
                                    <div className="flex justify-between items-center mb-1">
                                       <span className="text-gray-500 text-xs uppercase">
                                          Confidence Score
                                       </span>
                                       <span className="text-primary font-bold">
                                          {tweet.analysis.sentiment_score}
                                       </span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                       <div
                                          className="bg-primary h-full rounded-full"
                                          style={{
                                             width: `${confidencePercent}%`,
                                          }}></div>
                                    </div>
                                    <p className="mt-2 text-white font-bold tracking-wide">
                                       RESULT:{' '}
                                       <span className={sentimentColor}>
                                          {sentimentResult}
                                       </span>
                                    </p>
                                 </div>

                                 <div className="flex gap-2">
                                    <span className="text-gray-600 select-none">
                                       &gt;
                                    </span>
                                    <p>
                                       Key drivers:
                                       {tweet.analysis.keywords
                                          .slice(0, 2)
                                          .map((keyword, idx) => (
                                             <span key={idx}>
                                                {' '}
                                                <span className="text-gray-300">
                                                   &quot;{keyword}&quot;
                                                </span>
                                                {idx < 1 &&
                                                tweet.analysis.keywords.length >
                                                   1
                                                   ? ','
                                                   : ''}
                                             </span>
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
                              <div className="flex items-center justify-between px-1">
                                 <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                                    <span className="material-symbols-outlined text-[16px]">
                                       candlestick_chart
                                    </span>
                                    Associated Market{hasMultipleMarkets && 's'}
                                 </div>
                                 {hasMultipleMarkets && (
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] text-gray-500 font-mono">
                                          {currentMarketIndex + 1} / {markets.length}
                                       </span>
                                    </div>
                                 )}
                              </div>
                              <div className="relative">
                                 {/* Previous Button */}
                                 {hasMultipleMarkets && (
                                    <button
                                       onClick={goToPrevMarket}
                                       className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-3 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-primary transition-all flex items-center justify-center group/btn shadow-lg"
                                       aria-label="Previous market">
                                       <span className="material-symbols-outlined text-gray-400 group-hover/btn:text-primary text-[20px]">
                                          chevron_left
                                       </span>
                                    </button>
                                 )}

                                 {/* Next Button */}
                                 {hasMultipleMarkets && (
                                    <button
                                       onClick={goToNextMarket}
                                       className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-3 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-primary transition-all flex items-center justify-center group/btn shadow-lg"
                                       aria-label="Next market">
                                       <span className="material-symbols-outlined text-gray-400 group-hover/btn:text-primary text-[20px]">
                                          chevron_right
                                       </span>
                                    </button>
                                 )}

                              <div className="bg-surface-dark rounded-lg border border-gray-700 p-0 flex flex-col h-full overflow-hidden hover:border-gray-500 transition-colors shadow-lg group">
                                 {/* Market Header */}
                                 <div className="p-4 bg-gray-800/50 border-b border-gray-700">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                       <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 rounded bg-gray-800/80 text-[10px] uppercase font-bold text-gray-300 border border-gray-600 backdrop-blur-sm">
                                             Market
                                          </span>
                                          <span className="text-gray-400 text-xs">
                                             Vol: $
                                             {(market.volume_num / 1000000).toFixed(
                                                1
                                             )}
                                             M
                                          </span>
                                       </div>
                                       {lastRefreshTime && (
                                          <div className="flex items-center gap-1.5 text-gray-500 text-[10px]">
                                             <span className="material-symbols-outlined text-[12px]">
                                                sync
                                             </span>
                                             <span className="font-mono">
                                                Updated {getTimeAgo(lastRefreshTime)}
                                             </span>
                                          </div>
                                       )}
                                    </div>
                                    <p className="text-white font-bold text-base leading-snug group-hover:text-primary transition-colors">
                                       {market.question}
                                    </p>
                                 </div>

                                 {/* Odds */}
                                 <div className="p-5 flex-1 flex flex-col gap-4 bg-gradient-to-b from-surface-dark to-background-dark">
                                    <div className="grid grid-cols-2 gap-3">
                                       <div className="flex flex-col items-center justify-center bg-green-500/5 border border-green-500/20 rounded-lg p-2.5 hover:bg-green-500/10 transition-colors cursor-pointer">
                                          <span className="text-green-500 text-xs font-bold uppercase mb-1">
                                             Yes (Win)
                                          </span>
                                          <span className="text-white text-2xl font-bold">
                                             {yesOutcome
                                                ? (yesOutcome.price * 100).toFixed(2)
                                                : '0.00'}
                                             ¢
                                          </span>
                                          <span
                                             className={`text-[10px] font-mono ${
                                                market.one_day_price_change > 0
                                                   ? 'text-green-500/70'
                                                   : market.one_day_price_change <
                                                     0
                                                   ? 'text-red-500/70'
                                                   : 'text-gray-500/70'
                                             }`}>
                                             {market.one_day_price_change > 0
                                                ? '↑'
                                                : market.one_day_price_change <
                                                  0
                                                ? '↓'
                                                : '→'}{' '}
                                             {market.one_day_price_change?
                                                (market.one_day_price_change *
                                                   100).toFixed(2)
                                                   : '0.00'
                                             }
                                             %
                                          </span>
                                       </div>
                                       <div className="flex flex-col items-center justify-center bg-red-500/5 border border-red-500/20 rounded-lg p-2.5 hover:bg-red-500/10 transition-colors cursor-pointer">
                                          <span className="text-red-500 text-xs font-bold uppercase mb-1">
                                             No (Lose)
                                          </span>
                                          <span className="text-gray-300 text-2xl font-bold">
                                             {noOutcome
                                                ? (noOutcome.price * 100).toFixed(2)
                                                : '0.00'}
                                             ¢
                                          </span>
                                          <span
                                             className={`text-[10px] font-mono ${
                                                market.one_day_price_change < 0
                                                   ? 'text-green-500/70'
                                                   : market.one_day_price_change >
                                                     0
                                                   ? 'text-red-500/70'
                                                   : 'text-gray-500/70'
                                             }`}>
                                             {market.one_day_price_change < 0
                                                ? '↑'
                                                : market.one_day_price_change >
                                                  0
                                                ? '↓'
                                                : '→'}{' '}
                                             {market.one_day_price_change?
                                               (market.one_day_price_change *
                                                   100).toFixed(2)
                                                   : '0.00'
                                             }
                                             %
                                          </span>
                                       </div>
                                    </div>

                                    {/* Market Stats */}
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700/50">
                                       <div className="space-y-2">
                                          <div className="flex flex-col">
                                             <span className="text-[10px] uppercase text-gray-500 font-bold">
                                                Liquidity
                                             </span>
                                             <span className="text-white text-sm font-bold">
                                                $
                                                {(
                                                   market.liquidity / 1000
                                                ).toFixed(1)}
                                                K
                                             </span>
                                          </div>
                                          <div className="flex flex-col">
                                             <span className="text-[10px] uppercase text-gray-500 font-bold">
                                                24h Volume
                                             </span>
                                             <span className="text-white text-sm font-bold">
                                                $
                                                {(
                                                   market.volume_24hr / 1000
                                                ).toFixed(1)}
                                                K
                                             </span>
                                          </div>
                                       </div>
                                       <div className="space-y-2">
                                          <div className="flex flex-col">
                                             <span className="text-[10px] uppercase text-gray-500 font-bold">
                                                7d Volume
                                             </span>
                                             <span className="text-white text-sm font-bold">
                                                $
                                                {(
                                                   market.volume_1wk / 1000
                                                ).toFixed(1)}
                                                K
                                             </span>
                                          </div>
                                          <div className="flex flex-col">
                                             <span className="text-[10px] uppercase text-gray-500 font-bold">
                                                Status
                                             </span>
                                             <span
                                                className={`text-sm font-bold ${
                                                   market.active &&
                                                   !market.closed
                                                      ? 'text-green-500'
                                                      : market.closed
                                                      ? 'text-red-500'
                                                      : 'text-gray-500'
                                                }`}>
                                                {market.active && !market.closed
                                                   ? 'Active'
                                                   : market.closed
                                                   ? 'Closed'
                                                   : 'Inactive'}
                                             </span>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Tags */}
                                    {market.tags && market.tags.length > 0 && (
                                       <div className="pt-3 border-t border-gray-700/50">
                                          <span className="text-[10px] uppercase text-gray-500 font-bold block mb-2">
                                             Tags
                                          </span>
                                          <div className="flex flex-wrap gap-1.5">
                                             {market.tags
                                                .slice(0, 4)
                                                .map((tag) => (
                                                   <span
                                                      key={tag.id}
                                                      className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
                                                      {tag.label}
                                                   </span>
                                                ))}
                                          </div>
                                       </div>
                                    )}

                                    {/* End Date */}
                                    {market.end_date && (
                                       <div className="pt-3 border-t border-gray-700/50">
                                          <div className="flex items-center justify-between">
                                             <span className="text-[10px] uppercase text-gray-500 font-bold">
                                                Closes
                                             </span>
                                             <span className="text-gray-300 text-xs font-mono">
                                                {new Date(
                                                   market.end_date
                                                ).toLocaleDateString('en-US', {
                                                   month: 'short',
                                                   day: 'numeric',
                                                   year: 'numeric',
                                                })}
                                             </span>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>

                              {/* Carousel Indicators */}
                              {hasMultipleMarkets && (
                                 <div className="flex items-center justify-center gap-2 mt-3">
                                    {markets.map((_, idx) => (
                                       <button
                                          key={idx}
                                          onClick={() => setCurrentMarketIndex(idx)}
                                          className={`h-1.5 rounded-full transition-all ${
                                             idx === currentMarketIndex
                                                ? 'w-6 bg-primary'
                                                : 'w-1.5 bg-gray-700 hover:bg-gray-600'
                                          }`}
                                          aria-label={`Go to market ${idx + 1}`}
                                       />
                                    ))}
                                 </div>
                              )}
                           </div>
                           </div>
                        )}

                        {/* No Market Found */}
                        {!market && (
                           <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold px-1">
                                 <span className="material-symbols-outlined text-[16px]">
                                    candlestick_chart
                                 </span>
                                 Associated Market
                              </div>
                              <div className="bg-surface-dark rounded-lg border border-gray-700 p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]">
                                 <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 border-2 border-gray-700">
                                    <span className="material-symbols-outlined text-gray-500 text-[32px]">
                                       search_off
                                    </span>
                                 </div>
                                 <div className="text-center space-y-2">
                                    <h3 className="text-white font-bold text-lg">
                                       No Market Found
                                    </h3>
                                    <p className="text-gray-400 text-sm max-w-xs">
                                       No associated prediction market was found
                                       for this signal. The market may not exist
                                       yet or hasn&apos;t been matched.
                                    </p>
                                 </div>
                                 <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-1 rounded bg-gray-800/50 text-gray-500 text-xs font-mono border border-gray-700">
                                       Status: Not Available
                                    </span>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Footer Hint */}
                  <div className="mt-auto px-6 py-3 bg-background-dark/50 border-t border-gray-800 flex justify-between items-center text-xs">
                     <span className="text-gray-600 font-mono">
                        System Status:{' '}
                        <span className="text-green-500">ONLINE</span>
                     </span>
                     <div className="flex items-center gap-3">
                        {hasMultipleMarkets && (
                           <span className="text-gray-500 font-mono flex items-center gap-1">
                              <span className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                                 ←
                              </span>
                              <span className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                                 →
                              </span>{' '}
                              navigate
                           </span>
                        )}
                        <span className="text-gray-500 font-mono flex items-center gap-1">
                           <span className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                              ESC
                           </span>{' '}
                           to close
                        </span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </>
   );
}
