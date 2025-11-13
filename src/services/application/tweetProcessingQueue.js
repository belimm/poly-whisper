// src/services/application/tweetProcessingQueue.js
// Tweet processing queue with concurrency control using the async library
// Ensures tweets are processed sequentially/with controlled parallelism

import Queue from 'async/queue.js';
import { errorLog, devLog } from '../../utils/logger.js';

class TweetProcessingQueue {
   constructor(options = {}) {
      this.tweetDB = options.tweetDB;
      this.clientWS = options.clientWS;
      this.concurrency = options.concurrency || 2; // Max 2 tweets processed simultaneously
      this.maxQueueSize = options.maxQueueSize || 100;

      // Statistics tracking
      this.stats = {
         processed: 0,
         failed: 0,
         queueLength: 0,
         currentlyProcessing: 0,
         startTime: new Date(),
      };

      // Track failed tweets for later inspection
      this.failedTweets = [];

      if (!this.tweetDB) {
         throw new Error('TweetProcessingQueue requires tweetDB service');
      }

      // Create the queue with concurrency control
      // The processTweet method will be called for each tweet in queue
      this.queue = new Queue(this.processTweet.bind(this), this.concurrency);

      // Error handler - called when a task throws an error
      this.queue.error((error, task) => {
         const tweetId = task.tweetDetails?.tweetId || 'unknown';
         errorLog(`❌ Queue error processing tweet ${tweetId}:`, error.message);
         this.stats.failed++;
         this.handleFailedTweet(task, error);
      });

      // Drain handler - called when queue becomes empty
      this.queue.drain(() => {
         devLog('✅ Tweet processing queue drained - all tweets processed');
         if (this.clientWS) {
            this.clientWS.broadcastSystemMessage(
               'All tweets processed successfully',
               'success'
            );
         }
      });

      devLog(
         `🚀 Tweet processing queue initialized (concurrency: ${this.concurrency}, max queue size: ${this.maxQueueSize})`
      );
   }

   /**
    * Add an enriched tweet to the queue for processing
    * @param {object} enrichedTweet - Enriched tweet object
    * @returns {boolean} - True if added, false if queue is full
    */
   addTweet(enrichedTweet) {
      // Check if queue is getting full
      if (this.queue.length() >= this.maxQueueSize) {
         const tweetId = enrichedTweet.tweetDetails?.tweetId;
         errorLog(
            `❌ Tweet queue full (${this.queue.length()}/${this.maxQueueSize})! Rejecting tweet ${tweetId}`
         );
         if (this.clientWS) {
            this.clientWS.broadcastSystemMessage(
               '⚠️ Tweet processing queue is full - some tweets may be dropped',
               'warning'
            );
         }
         return false;
      }

      // Add tweet to queue with callback for when it's done
      this.queue.push(enrichedTweet, (error) => {
         if (error) {
            const tweetId = enrichedTweet.tweetDetails?.tweetId;
            errorLog(`❌ Tweet callback error for ${tweetId}:`, error.message);
         }
      });

      this.stats.queueLength = this.queue.length();
      devLog(
         `📥 Tweet added to queue (queue length: ${this.queue.length()}/${this.maxQueueSize})`
      );

      return true;
   }

   /**
    * Main processing function called for each tweet in the queue
    * This is where the actual database writes happen
    * @param {object} enrichedTweet - The enriched tweet to process
    */
   async processTweet(enrichedTweet) {
      const tweetId = enrichedTweet.tweetDetails?.tweetId || 'unknown';
      this.stats.currentlyProcessing++;
      const startTime = Date.now();

      try {
         devLog(
            `📝 [${this.stats.currentlyProcessing}/${this.concurrency}] Processing tweet: ${tweetId} (Queue: ${this.queue.length()})`
         );

         // 1. Insert the enriched tweet
         const dbTweet = await this.tweetDB.insertTweet(enrichedTweet);
         devLog(`  ✓ Tweet record created: ${dbTweet.id}`);

         // 2. Insert analysis if available
         if (enrichedTweet.analysis && dbTweet) {
            await this.tweetDB.insertAnalysis(dbTweet.id, enrichedTweet.analysis);
            devLog(`  ✓ Analysis saved for tweet: ${dbTweet.id}`);
         }

         // 3. Insert Polymarket matches if available
         if (enrichedTweet.polymarketMatches?.length > 0 && dbTweet) {
            await this.tweetDB.insertPolymarketMatches(
               dbTweet.id,
               enrichedTweet.polymarketMatches
            );
            devLog(
               `  ✓ Polymarket matches saved: ${enrichedTweet.polymarketMatches.length} matches`
            );
         }

         const duration = Date.now() - startTime;
         devLog(
            `✅ Tweet fully processed: ${tweetId} (${duration}ms)`
         );
         this.stats.processed++;

      } catch (error) {
         const duration = Date.now() - startTime;
         errorLog(
            `❌ Failed to process tweet ${tweetId} after ${duration}ms:`,
            error.message
         );
         throw error; // Let queue error handler catch it
      } finally {
         this.stats.currentlyProcessing--;
         this.stats.queueLength = this.queue.length();
      }
   }

   /**
    * Handle failed tweet processing
    * Stores failed tweet info for manual review
    * @param {object} task - The failed task
    * @param {Error} error - The error that occurred
    */
   handleFailedTweet(task, error) {
      const tweetId = task.tweetDetails?.tweetId || 'unknown';

      // Store failed tweet info
      this.failedTweets.push({
         tweetId,
         tweet: task,
         error: error.message,
         timestamp: new Date().toISOString(),
      });

      // Keep only last 50 failed tweets to prevent memory leak
      if (this.failedTweets.length > 50) {
         this.failedTweets.shift();
      }

      // Log detailed error for debugging
      errorLog(`[FAILED TWEET] ${tweetId}`);
      errorLog(`  Error: ${error.message}`);
      errorLog(`  Tweet Author: ${task.tweetDetails?.authorUsername}`);
      errorLog(`  Tweet Text: ${task.tweetDetails?.text?.substring(0, 100)}...`);

      // Notify frontend about failed tweet
      if (this.clientWS) {
         this.clientWS.broadcastSystemMessage(
            `Failed to process tweet from @${task.tweetDetails?.authorUsername}: ${error.message}`,
            'error'
         );
      }
   }

   /**
    * Get detailed queue statistics
    * @returns {object} - Queue statistics
    */
   getStats() {
      const uptime = Date.now() - this.stats.startTime.getTime();
      const avgTimePerTweet = this.stats.processed > 0
         ? (uptime / this.stats.processed).toFixed(2)
         : 0;

      return {
         processed: this.stats.processed,
         failed: this.stats.failed,
         queueLength: this.queue.length(),
         currentlyProcessing: this.stats.currentlyProcessing,
         concurrency: this.concurrency,
         maxQueueSize: this.maxQueueSize,
         successRate: this.stats.processed + this.stats.failed > 0
            ? ((this.stats.processed / (this.stats.processed + this.stats.failed)) * 100).toFixed(2) + '%'
            : 'N/A',
         uptime: `${(uptime / 1000).toFixed(2)}s`,
         avgTimePerTweet: `${avgTimePerTweet}ms`,
         failedTweetsLog: this.failedTweets.slice(-10), // Last 10 failed
      };
   }

   /**
    * Change concurrency on the fly (for tuning)
    * @param {number} newConcurrency - New concurrency level
    */
   setConcurrency(newConcurrency) {
      this.queue.concurrency = newConcurrency;
      this.concurrency = newConcurrency;
      devLog(`⚙️ Queue concurrency changed to ${newConcurrency}`);
   }

   /**
    * Kill/drain the queue (graceful shutdown)
    * Stops accepting new tasks and waits for current ones to finish
    */
   drain() {
      return new Promise((resolve) => {
         if (this.queue.length() === 0 && this.stats.currentlyProcessing === 0) {
            resolve();
         } else {
            this.queue.drain(() => {
               resolve();
            });
         }
      });
   }

   /**
    * Get number of pending tweets in queue
    * @returns {number} - Queue length
    */
   pending() {
      return this.queue.length();
   }

   /**
    * Kill queue immediately (not graceful)
    */
   kill() {
      this.queue.kill();
      devLog('🛑 Tweet processing queue killed');
   }
}

export default TweetProcessingQueue;
