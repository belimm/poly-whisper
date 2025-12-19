'use client'

export default function TrendingMarkets() {
  // Mock data for now - can be replaced with real data later
  const mockMarkets = [
    {
      id: '1',
      category: 'Politics',
      categoryIcon: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAUs-fpexi7q9l5g3S7IRu2I9nHwVHzcO_4mCqhceMmkpLc5Xrolug_RDYBEhWdyBONXtbedXLl6c4MQLkV5GXwk6ngkNgDMIYHK-P2Aw4n9wcF-eGVp3L0BFbTIQwu_rsMiMgzeUhOxcV1RvfirmpWv0PcVcMDbhRlVJlbn0Yb8XmtA6msqCckJsO2JmTHBD_1s0h3eIF9EunMWtt1DhdOyKEFVmRPsQBZrbpf6EFVNJcFaURlxC5D6ZSfJBmGxj49ZsIxsS9z1Ko',
      volume: '$45.2M Vol',
      question: 'Presidential Election Winner 2024',
      options: [
        { name: 'Trump', price: '52¢', color: 'green' },
        { name: 'Biden', price: '38¢', color: 'blue' }
      ]
    },
    {
      id: '2',
      category: 'Crypto',
      categoryIconType: 'icon',
      icon: 'currency_bitcoin',
      iconColor: 'orange',
      volume: '$12.8M Vol',
      question: 'Bitcoin > $100k in 2024?',
      probability: 32
    },
    {
      id: '3',
      category: 'Pop Culture',
      categoryIconType: 'icon',
      icon: 'movie',
      iconColor: 'purple',
      volume: '$2.1M Vol',
      question: 'Highest Grossing Movie 2024',
      options: [
        { name: 'Dune: Part Two', price: 'Yes 18¢', color: 'gray' },
        { name: 'Deadpool 3', price: 'Yes 15¢', color: 'gray' }
      ]
    },
    {
      id: '4',
      category: 'Science',
      categoryIconType: 'icon',
      icon: 'science',
      iconColor: 'blue',
      volume: '$5.4M Vol',
      question: 'LK-99 Superconductor Replicated?',
      probability: 4,
      probabilityColor: 'red'
    }
  ]

  return (
    <div className="flex flex-col min-h-[500px] h-full bg-background-light dark:bg-background-dark">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark border-b border-[#e5e7eb] dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
          <h3 className="text-sm font-bold tracking-wider uppercase text-[#111418] dark:text-gray-100">
            Trending Markets
          </h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-[#e5e7eb] dark:divide-border-dark">
          {mockMarkets.map((market) => (
            <div key={market.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {market.categoryIconType === 'icon' ? (
                    <div className={`size-6 rounded-full bg-${market.iconColor}-100 dark:bg-${market.iconColor}-900/30 flex items-center justify-center text-${market.iconColor}-500`}>
                      <span className="material-symbols-outlined text-[14px]">{market.icon}</span>
                    </div>
                  ) : (
                    <div
                      className="size-6 rounded-full bg-gray-200 dark:bg-gray-700 bg-center bg-cover"
                      style={{ backgroundImage: `url("${market.categoryIcon}")` }}
                    ></div>
                  )}
                  <span className="text-xs font-bold text-[#617589] uppercase tracking-wide">
                    {market.category}
                  </span>
                </div>
                <span className="text-xs text-[#617589]">{market.volume}</span>
              </div>
              <h4 className="text-sm font-bold text-[#111418] dark:text-white mb-3 group-hover:text-primary transition-colors">
                {market.question}
              </h4>
              {market.options && (
                <div className="grid grid-cols-2 gap-2">
                  {market.options.map((option, idx) => (
                    <div
                      key={idx}
                      className={`bg-gray-100 dark:bg-black/20 rounded p-2 flex justify-between items-center border border-transparent ${option.color === 'green' ? 'hover:border-green-500/30' : option.color === 'blue' ? 'hover:border-blue-500/30' : ''} transition-colors`}
                    >
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate mr-2">
                        {option.name}
                      </span>
                      <span className={`text-sm font-bold ${option.color === 'green' ? 'text-green-600 dark:text-green-400' : option.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                        {option.price}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {market.probability !== undefined && (
                <div className="flex items-center justify-between bg-gray-100 dark:bg-black/20 rounded p-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Probability
                    </span>
                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${market.probabilityColor === 'red' ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${market.probability}%` }}></div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${market.probabilityColor === 'red' ? 'text-red-500' : 'text-[#111418] dark:text-white'}`}>
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

