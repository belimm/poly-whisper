'use client'

import { useWebSocket } from '@/hooks/useWebSocket'

export default function TrendingMarkets() {
  const { trendingMarkets: trending, isConnected } = useWebSocket({ enabled: true })

  return (
    <div className="flex flex-col min-h-[500px] h-full bg-background-light dark:bg-background-dark">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark border-b border-[#e5e7eb] dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
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
      <div className="flex-1 overflow-y-auto">
        {trending.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            Loading trending markets...
          </div>
        )}
        <div className="divide-y divide-[#e5e7eb] dark:divide-border-dark">
          {trending.map((market) => (
            <div key={market.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-lg">
                    {market.categoryIcon}
                  </div>
                  <span className="text-xs font-bold text-[#617589] uppercase tracking-wide">
                    {market.categoryLabel}
                  </span>
                </div>
                <span className="text-xs text-[#617589]">{market.volume24hDisplay}</span>
              </div>
              <h4 className="text-sm font-bold text-[#111418] dark:text-white mb-3 group-hover:text-primary transition-colors">
                {market.question}
              </h4>
              {market.outcomes && market.outcomes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {market.outcomes.slice(0, 2).map((outcome, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-100 dark:bg-black/20 rounded p-2 flex justify-between items-center border border-transparent hover:border-primary/30 transition-colors"
                    >
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
                        style={{ width: `${market.probability}%` }}
                      ></div>
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
  )
}

