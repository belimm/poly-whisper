// src/services/tweetPipeline.js
// Listens to Twitter WebSocket 'tweet' events, analyzes tweets, queries Polymarket,
// and emits 'enrichedTweet' events containing analysis + any matching markets.

import { EventEmitter } from 'events';
import TweetAnalyzer from '../../domain/tweetAnalyzer.js';
import PolymarketService from './polymarketService.js';

class TweetPipeline extends EventEmitter {
   constructor(twitterWS, options = {}) {
      super();
      if (!twitterWS)
         throw new Error('TweetPipeline requires a twitterWS instance');
      this.twitterWS = twitterWS;
      this.analyzer = options.analyzer || new TweetAnalyzer();
      this.polymarket =
         options.polymarket ||
         new PolymarketService(options.polymarketOptions || {});
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
      const text = tweet?.text || tweet?.message || JSON.stringify(tweet);
      const analysis = this.analyzer.analyzeTweet(text);

      const markets = [];

      // For each extracted keyword, try searching Polymarket for matching markets/events
      for (const kw of analysis.keywords || []) {
         try {
            const data = await this.polymarket.search(kw, { size: 5 });
            // Keep raw response by keyword so caller can inspect
            markets.push({ keyword: kw, data });
         } catch (err) {
            this.log.error(
               'Polymarket search failed for keyword',
               kw,
               err?.message || err
            );
         }
      }

      const enriched = {
         original: tweet,
         text,
         analysis,
         polymarketMatches: markets,
         enrichedAt: new Date().toISOString(),
      };

      this.emit('enrichedTweet', enriched);
      return enriched;
   }
}

export default TweetPipeline;
