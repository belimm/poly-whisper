// src/services/tweetPipeline.js
// Listens to Twitter WebSocket 'tweet' events, analyzes tweets,
// and emits 'enrichedTweet' events containing analysis data.

import { EventEmitter } from 'events';
import TweetAnalyzer from '../../domain/tweetAnalyzer.js';

class TweetPipeline extends EventEmitter {
   constructor(twitterWS, options = {}) {
      super();
      if (!twitterWS)
         throw new Error('TweetPipeline requires a twitterWS instance');
      this.twitterWS = twitterWS;
      this.analyzer = options.analyzer || new TweetAnalyzer();
      this.log = options.log || console;

      this._setup();
   }

   _setup() {
      this.twitterWS.on('tweet', (tweet) => {
         // handle but don't block the WebSocket event loop
         this._handleTweet(tweet).catch((err) => {
            this.log.error('TweetPipeline _handleTweet error:', err);
            this.emit('error', err);
         });
      });
   }

   async _handleTweet(tweet) {
      // Skip replies and retweets - only process original tweets
      if (tweet.isReply) {
         console.log('⏭️  Skipping reply tweet from @' + tweet.authorUsername);
         return;
      }

      if (tweet.isRetweet) {
         console.log('⏭️  Skipping retweet from @' + tweet.authorUsername);
         return;
      }

      console.log('✅ Processing original tweet from @' + tweet.authorUsername);
      const text = tweet?.text || tweet?.message || JSON.stringify(tweet);
      // Try LLM analysis first, falls back to heuristics if LLM unavailable or fails
      const analysis = await this.analyzer.analyzeWithLLM(text);

      const enriched = {
         tweetDetails: tweet,
         analysis,
         enrichedAt: new Date().toISOString(),
      };

      this.emit('enrichedTweet', enriched);
      return enriched;
   }
}

export default TweetPipeline;
