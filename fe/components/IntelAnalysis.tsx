'use client'

export default function IntelAnalysis() {
  // Mock data for now
  const analyses = [
    {
      id: '1',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmdkVrjhpDe2sDNaAC5xyMzsFgTbXjLXL8pH_auZ0eOUQHH2rUs2mAL-BiLfVbPKQHW5B7M8VnLIw0bYCC_BZg6gtb1oFACU9RjnWbbADtLSlHNJJZxQ4Rs8M3EMpiSsbvZ1jY_tJxYcgR5GoXzFihcKMN7CLE5p7PVvdejMdmf_6qKk2QFIuZS1p31Su9MXo6enrNeH-vC9nXXGndoX85Omj3AJ7-pA4c1sIDcwVY7DHJ68vZHpyeezZj078YDwSVp67uBiZFrVIj',
      username: '@CryptoWhale',
      sentiment: 'Bullish',
      sentimentColor: 'green',
      quote: '"Institutional flows into ETH L2s are skyrocketing. Q1 metrics suggest a major breakout relative to mainnet."',
      prediction: 'Arbitrum > $2 by March',
      confidence: '94%',
      impactScore: 'High',
      outcome: 'YES',
      outcomeColor: 'green'
    },
    {
      id: '2',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCL3BHauvTihWISUk1GQfBGeGnOPgrwBiN4ATSaq7atioKars6wqu7IXNaxrUPQ1Vsq1SLz0V_W5UdOHPbT-pjPBQQGwoKJQiPvKb9edJOG34Nsbu_O5syhtmw81X17SsabriOofL-AMJ9CGBkXOovXJkCnML1OsweVR3cMAQ-u0vIeTQCPmUbSES1JBEoaUvA1jhz1_Lpqm2IDCTKIm7pW3tKjqA7_IDGgT4NnfzaZdD5E__WD-YxxXH842KE_IMj2achP2gb0iuva',
      username: '@ElonMusk',
      sentiment: 'Yes',
      sentimentColor: 'green',
      quote: '"X payments coming soon."',
      prediction: 'Doge Payments on X in 2024',
      confidence: '88%',
      impactScore: 'Medium',
      outcome: 'YES',
      outcomeColor: 'green'
    },
    {
      id: '3',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCd1dcm5JiQxtkUlCLsTtON5CEPQLmvk68nd0CTC5oYbMQYfjR8HpEcrF2AEVqJTUHkAeYw-BwUNxK76jZoBGgpz66Xc6cHlL3liJoctWKZzwOsfe_SitwDLSCb9QMKm-sklE8zaj14eG10krdkv_o3h2oSDlKWXJKSE7PBxICRcE5EKLaeeCSZnXbtTcC4-2bWU3nj82NzS4l2UJnZEJEDwrWQ9b8z02g-YI_XTCObgZsXmgdBt84Qvvv_B3mJAJfeh6T9seYYacnz',
      username: '@TechCrunch',
      sentiment: 'Bearish',
      sentimentColor: 'red',
      quote: '"Regulatory hurdles for AI copyright are mounting. Major lawsuits expected next week."',
      prediction: 'OpenAI Valuation > $100B',
      confidence: '76%',
      impactScore: 'Negative',
      outcome: 'NO',
      outcomeColor: 'red'
    }
  ]

  return (
    <div className="flex flex-col min-h-[500px] h-full bg-background-light dark:bg-background-dark">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark border-b border-[#e5e7eb] dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
          <h3 className="text-sm font-bold tracking-wider uppercase text-[#111418] dark:text-gray-100">
            Intel & Analysis
          </h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {analyses.map((analysis) => (
          <div
            key={analysis.id}
            className="rounded-lg border border-[#e5e7eb] dark:border-border-dark bg-white dark:bg-surface-dark p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="size-6 bg-cover rounded-full bg-center"
                  style={{ backgroundImage: `url("${analysis.avatar}")` }}
                ></div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {analysis.username}
                </span>
              </div>
              <span
                className={`inline-flex items-center rounded-md bg-${analysis.sentimentColor}-500/10 px-2 py-1 text-xs font-bold text-${analysis.sentimentColor}-500 ring-1 ring-inset ring-${analysis.sentimentColor}-500/20 uppercase`}
              >
                {analysis.sentiment}
              </span>
            </div>
            <p className="text-xs italic text-gray-600 dark:text-gray-400 mb-3 border-l-2 border-gray-300 dark:border-gray-600 pl-2 leading-relaxed">
              {analysis.quote}
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
                <span className="text-gray-500">Impact Score: {analysis.impactScore}</span>
                <span className={`text-${analysis.outcomeColor}-500 font-bold`}>
                  {analysis.outcome}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

