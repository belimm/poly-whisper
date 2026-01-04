'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import MobileSection from './MobileSection'
import TypewriterEffect from './TypewriterEffect'

export default function TrendingMarkets() {
  const { trendingMarkets: trending, isConnected } = useWebSocket({ enabled: true })
  const [visibleCount, setVisibleCount] = useState(5)
  const [isMobile, setIsMobile] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const displayedMarkets = isMounted && isMobile ? trending.slice(0, visibleCount) : trending
  const hasMore = isMounted && isMobile && visibleCount < trending.length

  const loadMore = () => {
    setVisibleCount(prev => prev + 5)
  }

  const statusBadge = !isConnected ? (
    <div className="flex items-center gap-2">
      <span className="flex size-2 rounded-full bg-gray-400 animate-pulse"></span>
      <span className="text-[10px] font-mono text-gray-400 font-bold hidden xl:block">
        CONNECTING
      </span>
    </div>
  ) : null;

  return (
     <div className="flex flex-col h-full min-h-0">
        {/* Mobile Version with Accordion */}
        <div
           className={`flex flex-col h-full min-h-0 ${
              trending.length !== 0 &&
              'bg-background-light dark:bg-background-dark'
           } md:hidden`}>
           <MobileSection
              title="Trending Markets"
              icon="trending_up"
              statusBadge={statusBadge}>
              {trending.length === 0 && (
                 <div className="p-4 text-center text-sm text-gray-500">
                    <TypewriterEffect text="Loading hot markets" />
                 </div>
              )}
              <div className="divide-y divide-[#e5e7eb] dark:divide-border-dark">
                 {displayedMarkets.map((market) => (
                    <div
                       key={market.id}
                       className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                             <div className="text-lg">
                                {market.categoryIcon}
                             </div>
                             <span className="text-xs font-bold text-[#617589] uppercase tracking-wide">
                                {market.categoryLabel}
                             </span>
                          </div>
                          <span className="text-xs text-[#617589]">
                             {market.volume24hDisplay}
                          </span>
                       </div>
                       <h4 className="text-sm font-bold text-[#111418] dark:text-white mb-3 group-hover:text-primary transition-colors">
                          {market.question}
                       </h4>
                       {market.outcomes && market.outcomes.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                             {market.outcomes
                                .slice(0, 2)
                                .map((outcome, idx) => (
                                   <div
                                      key={idx}
                                      className="bg-gray-100 dark:bg-black/20 rounded p-2 flex justify-between items-center border border-transparent hover:border-primary/30 transition-colors">
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate mr-2">
                                         {outcome.name}
                                      </span>
                                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                                         {outcome.priceDisplay}
                                      </span>
                                   </div>
                                ))}
                          </div>
                       ) : (
                          <div className="flex items-center justify-between bg-gray-100 dark:bg-black/20 rounded p-2">
                             <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                   Probability
                                </span>
                                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                   <div
                                      className="h-full bg-primary"
                                      style={{
                                         width: `${market.probability}%`,
                                      }}></div>
                                </div>
                             </div>
                             <span className="text-sm font-bold text-[#111418] dark:text-white">
                                {market.probability}%
                             </span>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
              {hasMore && (
                 <div className="p-4">
                    <button
                       onClick={loadMore}
                       className="w-full px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors">
                       Load More
                    </button>
                 </div>
              )}
           </MobileSection>
        </div>

        {/* Desktop Version */}
        <div className="hidden md:flex flex-col max-h-full min-h-0 bg-background-light dark:bg-background-dark overflow-y-auto">
           <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark border-b border-[#e5e7eb] dark:border-border-dark">
              <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary text-[20px]">
                    trending_up
                 </span>
                 <h3 className="text-sm font-bold tracking-wider uppercase text-[#111418] dark:text-gray-100">
                    Trending Markets
                 </h3>
              </div>
              {!isConnected && (
                 <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-gray-400 animate-pulse"></span>
                    <span className="text-[10px] font-mono text-gray-400 font-bold">
                       CONNECTING
                    </span>
                 </div>
              )}
           </div>
           <div className="flex-1 flex flex-col gap-3 p-4">
              {trending.length === 0 && (
                 <div className="p-4 text-center text-sm text-gray-500">
                    <TypewriterEffect text="Loading hot markets" />
                 </div>
              )}
              {trending.map((market) => (
                 <div
                    key={market.id}
                    className="p-4 rounded-lg border border-[#e5e7eb] dark:border-border-dark bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                          <div className="text-lg">{market.categoryIcon}</div>
                          <span className="text-xs font-bold text-[#617589] uppercase tracking-wide">
                             {market.categoryLabel}
                          </span>
                       </div>
                       <span className="text-xs text-[#617589]">
                          {market.volume24hDisplay}
                       </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#111418] dark:text-white mb-3 group-hover:text-primary transition-colors">
                       {market.question}
                    </h4>
                    {market.outcomes && market.outcomes.length > 0 ? (
                       <div className="grid grid-cols-2 gap-2">
                          {market.outcomes.slice(0, 2).map((outcome, idx) => (
                             <div
                                key={idx}
                                className="bg-gray-100 dark:bg-black/20 rounded p-2 flex justify-between items-center border border-transparent hover:border-primary/30 transition-colors">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate mr-2">
                                   {outcome.name}
                                </span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                   {outcome.priceDisplay}
                                </span>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="flex items-center justify-between bg-gray-100 dark:bg-black/20 rounded p-2">
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Probability
                             </span>
                             <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                   className="h-full bg-primary"
                                   style={{
                                      width: `${market.probability}%`,
                                   }}></div>
                             </div>
                          </div>
                          <span className="text-sm font-bold text-[#111418] dark:text-white">
                             {market.probability}%
                          </span>
                       </div>
                    )}
                 </div>
              ))}
           </div>
        </div>
     </div>
  );
}
