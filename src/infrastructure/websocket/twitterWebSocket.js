// twitterWebSocket.js
import WebSocket from 'ws';
import { EventEmitter } from 'events';

class TwitterWebSocketService extends EventEmitter {
   constructor() {
      super();
      this.ws = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 90000; // 90 seconds as per documentation

      this.KEY = process.env.TWITTERAPI_IO_KEY;
      // Use the correct WebSocket URL from documentation
      this.URL = 'wss://ws.twitterapi.io/twitter/tweet/websocket';

      // Debug logging
      console.log('🔧 TwitterWebSocket config:');
      console.log('  URL:', this.URL);
      console.log('  API Key:', this.KEY ? `${this.KEY.substring(0, 10)}...` : 'NOT SET');
      
      if (!this.KEY) {
         console.error('❌ Missing required environment variables:');
         console.error('  - TWITTERAPI_IO_KEY is not set');
         console.error('  - Please set your API key in .env file');
      }
   }

   connect() {
      try {
         if (!this.KEY || !this.URL) {
            const error = new Error('Cannot connect: Missing API key or WebSocket URL');
            console.error('❌', error.message);
            this.emit('error', error);
            return;
         }

         console.log('🔗 Attempting to connect to Twitter WebSocket...');
         this.ws = new WebSocket(this.URL, {
            headers: { 'x-api-key': this.KEY },
         });

         this.setupEventHandlers();
      } catch (error) {
         console.error('❌ Failed to create WebSocket connection:', error);
         this.emit('error', error);
      }
   }

   setupEventHandlers() {
      this.ws.on('open', () => {
         console.log('Twitter WebSocket connected');
         this.isConnected = true;
         this.reconnectAttempts = 0;
         this.emit('connected');
      });

      this.ws.on('message', (buf) => {
         this.handleMessage(buf);
      });

      this.ws.on('close', (code, reason) => {
         console.log('Twitter WebSocket closed', code, reason?.toString?.());
         this.isConnected = false;
         this.emit('disconnected', { code, reason: reason?.toString?.() });

         // Attempt to reconnect
         this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
         console.error('Twitter WebSocket error:', error);
         this.emit('error', error);
      });
   }

   handleMessage(buf) {
      let msg;
      try {
         msg = JSON.parse(buf.toString());
      } catch (error) {
         console.error('Failed to parse WebSocket message:', error);
         return;
      }

      // Handle server events
      if (msg.event_type === 'connected') {
         console.log('Twitter WebSocket handshake OK');
         this.emit('handshake');
         return;
      }

      if (msg.event_type === 'ping') {
         // Handle heartbeat - you might want to emit this for monitoring
         this.emit('ping');
         return;
      }

      if (msg.event_type === 'tweet' && Array.isArray(msg.tweets)) {
         for (const tweet of msg.tweets) {
            const normalizedTweet = this.normalizeTweet(tweet, msg);
            this.emit('tweet', normalizedTweet);
         }
      } else {
         // Other server messages
         console.log('Other Twitter WebSocket message:', msg);
         this.emit('message', msg);
      }
   }

   normalizeTweet(tweet, originalMessage) {
      const author = tweet.author || {};
      return {
         tweetId: tweet.id,
         userAvatar: author.profilePicture,
         text: tweet.text,
         createdAt: tweet.createdAt,
         authorId: author.id,
         authorUsername: author.username,
         authorName: author.name,
         likeCount: tweet.likeCount,
         retweetCount: tweet.retweetCount,
         replyCount: tweet.replyCount,
         url: author.username
            ? `https://x.com/${author.username}/status/${tweet.id}`
            : undefined,
         ruleId: originalMessage.rule_id,
         ruleTag: originalMessage.rule_tag,
         receivedAtMs: originalMessage.timestamp,
      };
   }

   attemptReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
         console.error('❌ Max reconnection attempts reached. Manual intervention required.');
         console.log('💡 Possible solutions:');
         console.log('  1. Check your API key validity');
         console.log('  2. Verify WebSocket URL is correct');
         console.log('  3. Use POST /websocket/reconnect to reset and retry');
         this.emit('maxReconnectAttemptsReached');
         return;
      }

      this.reconnectAttempts++;
      console.log(
         `🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`
      );

      setTimeout(() => {
         this.connect();
      }, this.reconnectDelay);
   }

   // Reset reconnection attempts and try again
   forceReconnect() {
      console.log('🔄 Force reconnect requested - resetting attempts...');
      this.reconnectAttempts = 0;
      this.disconnect();
      setTimeout(() => {
         this.connect();
      }, 1000);
   }

   disconnect() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
         this.ws.close();
      }
      this.isConnected = false;
   }

   getConnectionStatus() {
      return {
         isConnected: this.isConnected,
         reconnectAttempts: this.reconnectAttempts,
         readyState: this.ws ? this.ws.readyState : null,
      };
   }
}

export default TwitterWebSocketService;
