'use client'

import Header from './Header'
import TheWire from './TheWire'
import TrendingMarkets from './TrendingMarkets'
import HotMarkets from './HotMarkets'
import IntelAnalysis from './IntelAnalysis'

export default function Dashboard() {
  return (
    <>
      <Header />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 min-h-0 divide-y md:divide-y-0 md:divide-x divide-[#e5e7eb] dark:divide-border-dark overflow-y-auto md:overflow-hidden">
        <TheWire />
        <TrendingMarkets />
        <HotMarkets />
        <IntelAnalysis />
      </div>
    </>
  )
}

