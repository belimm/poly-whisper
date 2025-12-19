'use client'

export default function HotMarkets() {
  // Mock data for now
  const hotMarkets = [
    {
      id: '1',
      label: 'Rapid Rise',
      icon: 'trending_up',
      iconColor: 'orange',
      title: 'Solana ETF Approval',
      change: '+18%',
      changeTime: 'Last 1h',
      changeColor: 'green',
      progress: 75,
      progressColor: 'from-orange-400 to-red-500',
      volume: '$2.4M',
      price: '42¢',
      borderColor: 'orange'
    },
    {
      id: '2',
      label: 'Volume Spike',
      icon: 'show_chart',
      iconColor: 'blue',
      title: 'GPT-5 Release Q2',
      change: '--',
      changeTime: 'Steady',
      changeColor: 'gray',
      progress: 15,
      progressColor: 'bg-blue-500',
      volume: 'Vol: +400% (24h)',
      volumeHighlight: true,
      price: '12¢',
      borderColor: 'blue'
    },
    {
      id: '3',
      label: 'Sell Off',
      icon: 'trending_down',
      iconColor: 'red',
      title: 'ETH Flippening 2024',
      change: '-12%',
      changeTime: 'Last 1h',
      changeColor: 'red',
      progress: 8,
      progressColor: 'bg-red-500',
      volume: '$800k',
      price: '08¢',
      borderColor: 'red'
    },
    {
      id: '4',
      label: 'News Break',
      icon: 'bolt',
      iconColor: 'purple',
      title: 'Super Bowl Halftime Surprise',
      change: '+5%',
      changeTime: 'Last 10m',
      changeColor: 'green',
      progress: 60,
      progressColor: 'bg-purple-500',
      volume: '$1.2M',
      price: '60¢',
      borderColor: 'purple'
    }
  ]

  return (
    <div className="flex flex-col min-h-[500px] h-full bg-background-light dark:bg-background-dark">
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
          <span className="flex size-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
          <span className="text-[10px] font-mono text-orange-500 font-bold hidden xl:block">
            VOLATILE
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {hotMarkets.map((market) => (
          <div
            key={market.id}
            className={`group relative flex flex-col gap-2 rounded-lg border border-[#e5e7eb] dark:border-border-dark bg-white dark:bg-surface-dark p-4 shadow-sm hover:border-${market.borderColor}-500/50 dark:hover:border-${market.borderColor}-500/50 cursor-pointer transition-all`}
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`material-symbols-outlined text-[14px] text-${market.iconColor}-500`}>
                    {market.icon}
                  </span>
                  <span className={`text-[10px] font-bold text-${market.iconColor}-500 uppercase tracking-wider`}>
                    {market.label}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#111418] dark:text-white leading-tight">
                  {market.title}
                </h4>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-sm font-bold text-${market.changeColor}-500`}>
                  {market.change}
                </span>
                <span className="text-[10px] text-gray-500">{market.changeTime}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full ${market.progressColor} ${market.progressColor.includes('gradient') ? 'shadow-[0_0_10px_rgba(249,115,22,0.5)]' : ''}`}
                style={{ width: `${market.progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
              <span className={`text-xs ${market.volumeHighlight ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                {market.volumeHighlight ? market.volume : `Vol: ${market.volume}`}
              </span>
              <span className="text-xs font-mono font-bold text-[#111418] dark:text-gray-300">
                YES: {market.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

