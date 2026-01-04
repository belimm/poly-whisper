'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import MobileSection from './MobileSection'
import TypewriterEffect from './TypewriterEffect'

export default function HotMarkets() {
  const { hotMarkets: hot, isConnected } = useWebSocket({ enabled: true })
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

  const displayedMarkets = isMounted && isMobile ? hot.slice(0, visibleCount) : hot
  const hasMore = isMounted && isMobile && visibleCount < hot.length

  const loadMore = () => {
    setVisibleCount(prev => prev + 5)
  }

  // Map hot reason to icon and color
  const getHotReasonIcon = (reason?: string) => {
    switch (reason) {
      case 'RAPID_RISE':
        return 'trending_up'
      case 'SELL_OFF':
        return 'trending_down'
      case 'VOLUME_SPIKE':
        return 'show_chart'
      case 'RISING':
        return 'trending_up'
      case 'FALLING':
        return 'trending_down'
      case 'HIGH_ACTIVITY':
        return 'local_fire_department'
      case 'NEWS_BREAK':
        return 'bolt'
      case 'VOLATILE':
      default:
        return 'show_chart'
    }
  }

  const statusBadge = (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <span className="flex size-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
          <span className="text-[10px] font-mono text-orange-500 font-bold hidden xl:block">
            VOLATILE
          </span>
        </>
      ) : (
        <>
          <span className="flex size-2 rounded-full bg-gray-400 animate-pulse"></span>
          <span className="text-[10px] font-mono text-gray-400 font-bold hidden xl:block">
            CONNECTING
          </span>
        </>
      )}
    </div>
  );

  return (
     <div className="flex flex-col h-full min-h-0">
        {/* Mobile Version with Accordion */}
        <div
           className={`p-4 flex flex-col h-full min-h-0 ${
              hot.length !== 0 && 'bg-background-light dark:bg-background-dark'
           } md:hidden`}>
           <MobileSection
              title="Hot Markets"
              icon="local_fire_department"
              iconColor="text-orange-500"
              statusBadge={statusBadge}>
              <div className="flex flex-col gap-3">
                 {hot.length === 0 && (
                    <div className="p-4 text-center text-md text-gray-500">
                       <TypewriterEffect text="Loading hot markets" />
                    </div>
                 )}
                 {displayedMarkets.map((market) => {
                    const icon = getHotReasonIcon(market.hotReason);
                    const reasonConfig = market.hotReasonConfig || {
                       label: 'VOLATILE',
                       color: '#8b5cf6',
                       textColor: '#fff',
                    };

                    return (
                       <div
                          key={market.id}
                          className="group relative flex flex-col gap-2 rounded-lg border border-[#e5e7eb] dark:border-border-dark bg-white dark:bg-surface-dark p-4 shadow-sm hover:border-orange-500/50 dark:hover:border-orange-500/50 cursor-pointer transition-all">
                          <div className="flex items-start justify-between">
                             <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 mb-1">
                                   <span
                                      className="material-symbols-outlined text-[14px]"
                                      style={{ color: reasonConfig.color }}>
                                      {icon}
                                   </span>
                                   <span
                                      className="text-[10px] font-bold uppercase tracking-wider"
                                      style={{ color: reasonConfig.color }}>
                                      {reasonConfig.label}
                                   </span>
                                </div>
                                <h4 className="text-sm font-bold text-[#111418] dark:text-white leading-tight">
                                   {market.question}
                                </h4>
                             </div>
                             <div className="flex flex-col items-end">
                                <span
                                   className={`text-sm font-bold ${
                                      market.priceChange1h > 0
                                         ? 'text-green-500'
                                         : market.priceChange1h < 0
                                         ? 'text-red-500'
                                         : 'text-gray-500'
                                   }`}>
                                   {market.priceChange1h > 0 ? '+' : ''}
                                   {(market.priceChange1h * 100).toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-gray-500">
                                   Last 1h
                                </span>
                             </div>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-1 overflow-hidden">
                             <div
                                className="h-full"
                                style={{
                                   width: `${market.probability}%`,
                                   backgroundColor: reasonConfig.color,
                                }}></div>
                          </div>
                          <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                             <span
                                className={`text-xs ${
                                   market.volumeSpike > 100
                                      ? 'font-bold'
                                      : 'text-gray-500'
                                }`}
                                style={
                                   market.volumeSpike > 100
                                      ? { color: reasonConfig.color }
                                      : {}
                                }>
                                {market.volumeSpike > 100
                                   ? `Vol: +${Math.round(
                                        market.volumeSpike
                                     )}% (24h)`
                                   : `Vol: ${market.volume24hDisplay}`}
                             </span>
                             <span className="text-xs font-mono font-bold text-[#111418] dark:text-gray-300">
                                YES: {market.yesPriceDisplay}
                             </span>
                          </div>
                       </div>
                    );
                 })}
                 {hasMore && (
                    <button
                       onClick={loadMore}
                       className="w-full px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors">
                       Load More
                    </button>
                 )}
              </div>
           </MobileSection>
        </div>

        {/* Desktop Version */}
        <div
           className={`hidden md:flex flex-col max-h-full min-h-0 ${
              hot.length !== 0 && 'bg-background-light dark:bg-background-dark'
           } overflow-y-auto`}>
           <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark border-b border-[#e5e7eb] dark:border-border-dark">
              <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-orange-500 text-[20px]">
                    local_fire_department
                 </span>
                 <h3 className="text-sm font-bold tracking-wider uppercase text-[#111418] dark:text-gray-100">
                    Hot Markets
                 </h3>
              </div>
              <div className="flex items-center gap-2">
                 {isConnected ? (
                    <>
                       <span className="flex size-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
                       <span className="text-[10px] font-mono text-orange-500 font-bold hidden xl:block">
                          VOLATILE
                       </span>
                    </>
                 ) : (
                    <>
                       <span className="flex size-2 rounded-full bg-gray-400 animate-pulse"></span>
                       <span className="text-[10px] font-mono text-gray-400 font-bold hidden xl:block">
                          CONNECTING
                       </span>
                    </>
                 )}
              </div>
           </div>
           <div className="flex-1 flex flex-col gap-3 p-4">
              {hot.length === 0 && (
                 <div className="p-4 text-center text-md text-gray-500">
                    <TypewriterEffect text="Loading hot markets" />
                 </div>
              )}
              {hot.map((market) => {
                 const icon = getHotReasonIcon(market.hotReason);
                 const reasonConfig = market.hotReasonConfig || {
                    label: 'VOLATILE',
                    color: '#8b5cf6',
                    textColor: '#fff',
                 };

                 return (
                    <div
                       key={market.id}
                       className="group relative flex flex-col gap-2 p-4 rounded-lg border border-[#e5e7eb] dark:border-border-dark bg-white dark:bg-surface-dark p-4 shadow-sm hover:border-orange-500/50 dark:hover:border-orange-500/50 cursor-pointer transition-all">
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                             <div className="flex items-center gap-1.5 mb-1">
                                <span
                                   className="material-symbols-outlined text-[14px]"
                                   style={{ color: reasonConfig.color }}>
                                   {icon}
                                </span>
                                <span
                                   className="text-[10px] font-bold uppercase tracking-wider"
                                   style={{ color: reasonConfig.color }}>
                                   {reasonConfig.label}
                                </span>
                             </div>
                             <h4 className="text-sm font-bold text-[#111418] dark:text-white leading-tight">
                                {market.question}
                             </h4>
                          </div>
                          <div className="flex flex-col items-end">
                             <span
                                className={`text-sm font-bold ${
                                   market.priceChange1h > 0
                                      ? 'text-green-500'
                                      : market.priceChange1h < 0
                                      ? 'text-red-500'
                                      : 'text-gray-500'
                                }`}>
                                {market.priceChange1h > 0 ? '+' : ''}
                                {(market.priceChange1h * 100).toFixed(1)}%
                             </span>
                             <span className="text-[10px] text-gray-500">
                                Last 1h
                             </span>
                          </div>
                       </div>
                       <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                             className="h-full"
                             style={{
                                width: `${market.probability}%`,
                                backgroundColor: reasonConfig.color,
                             }}></div>
                       </div>
                       <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                          <span
                             className={`text-xs ${
                                market.volumeSpike > 100
                                   ? 'font-bold'
                                   : 'text-gray-500'
                             }`}
                             style={
                                market.volumeSpike > 100
                                   ? { color: reasonConfig.color }
                                   : {}
                             }>
                             {market.volumeSpike > 100
                                ? `Vol: +${Math.round(
                                     market.volumeSpike
                                  )}% (24h)`
                                : `Vol: ${market.volume24hDisplay}`}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#111418] dark:text-gray-300">
                             YES: {market.yesPriceDisplay}
                          </span>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
     </div>
  );
}

