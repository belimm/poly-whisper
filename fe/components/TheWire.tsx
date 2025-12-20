'use client'

import { EnrichedTweet } from '@/lib/types'

interface TheWireProps {
  tweets: EnrichedTweet[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
}

function TweetCard({ tweet }: { tweet: EnrichedTweet }) {
  const getSentimentClass = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500/10 text-green-500 ring-green-500/20'
      case 'negative':
        return 'bg-red-500/10 text-red-500 ring-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 ring-gray-500/20'
    }
  }

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'Bullish'
      case 'negative':
        return 'Bearish'
      default:
        return 'Neutral'
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date().getTime()
    const tweetTime = new Date(date).getTime()
    const diff = Math.floor((now - tweetTime) / 1000) // seconds

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const linkifyText = (text: string) => {
    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  // Get first keyword/category as market link
  const marketKeyword = tweet.analysis.keywords[0] || tweet.analysis.categories[0] || 'Market'

  console.log(tweet);

  const tweetUrl = `https://x.com/${tweet.tweetDetails.authorUsername}/status/${tweet.tweetDetails.tweetId}`

  return (
     <div className="flex gap-3 pb-4 border-b border-dashed border-[#e5e7eb] dark:border-border-dark last:border-0">
        <div
           className="bg-center bg-no-repeat bg-cover rounded-full size-10 shrink-0"
           style={{
              backgroundImage: `url("${tweet.tweetDetails.authorAvatarURL}")`,
           }}></div>
        <div className="flex flex-1 flex-col gap-2">
           <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                 <p className="text-[#111418] dark:text-white text-sm font-bold">
                    @{tweet.tweetDetails.authorUsername}
                 </p>
                 <p className="text-[#617589] text-xs">
                    {getTimeAgo(tweet.tweetDetails.createdAt)}
                 </p>
              </div>
              <p className="text-[#111418] dark:text-gray-300 text-sm leading-snug">
                 {linkifyText(tweet.tweetDetails.text)}
              </p>
           </div>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getSentimentClass(
                       tweet.analysis.sentiment
                    )}`}>
                    {getSentimentLabel(tweet.analysis.sentiment)}
                 </span>
                 <div className="h-4 w-px bg-[#e5e7eb] dark:bg-border-dark"></div>
                 <a
                    className="flex items-center gap-1 text-primary text-xs hover:underline"
                    href={tweet.tweetDetails.url}
                    target="_blank"
                    rel="noopener noreferrer">
                    <span>{marketKeyword}</span>
                    <span className="material-symbols-outlined text-[14px]">
                       arrow_outward
                    </span>
                 </a>
              </div>
              <a
                 href={tweetUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="opacity-40 hover:opacity-100 transition-opacity"
                 title="View on X">
                 <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 fill-current text-[#111418] dark:text-gray-300"
                    aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                 </svg>
              </a>
           </div>
        </div>
     </div>
  );
}

export default function TheWire({ tweets, loading, error, hasMore, loadMore }: TheWireProps) {

  return (
    <div className="flex flex-col min-h-[500px] h-full bg-background-light dark:bg-background-dark">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark border-b border-[#e5e7eb] dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">chat</span>
          <h3 className="text-sm font-bold tracking-wider uppercase text-[#111418] dark:text-gray-100">
            The Wire
          </h3>
        </div>
        <div className="flex gap-2">
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded">
            <span className="material-symbols-outlined text-gray-500 text-[18px]">tune</span>
          </button>
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

        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}

        {hasMore && !loading && (
          <button
            onClick={loadMore}
            className="mt-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
          >
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
  )
}

