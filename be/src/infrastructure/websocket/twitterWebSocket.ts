/**
 * Twitter WebSocket Service
 * Connects to Twitter API via WebSocket and emits tweet events
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type {
  TwitterWebSocketMessage,
  TwitterRawTweet,
  TweetDetails,
} from '../../types/index.js';

export class TwitterWebSocketService extends EventEmitter {
  // EventEmitter methods (on, emit, etc.) are inherited
  // TypeScript will recognize them from EventEmitter base class
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 90000; // 90 seconds as per documentation
  private readonly KEY: string | undefined;
  private readonly URL = 'wss://ws.twitterapi.io/twitter/tweet/websocket';

  constructor() {
    super();
    this.KEY = process.env.TWITTERAPI_IO_KEY;

    console.log('🔧 TwitterWebSocket config:');
    console.log('  URL:', this.URL);
    console.log(
      '  API Key:',
      this.KEY ? `${this.KEY.substring(0, 10)}...` : 'NOT SET'
    );

    if (!this.KEY) {
      console.error('❌ Missing required environment variables:');
      console.error('  - TWITTERAPI_IO_KEY is not set');
      console.error('  - Please set your API key in .env file');
    }
  }

  connect(): void {
    try {
      if (!this.KEY || !this.URL) {
        const error = new Error(
          'Cannot connect: Missing API key or WebSocket URL'
        );
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

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', () => {
      console.log('Twitter WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.ws.on('message', (buf: Buffer) => {
      this.handleMessage(buf);
    });

    this.ws.on('close', (code: number, reason?: Buffer) => {
      console.log(
        'Twitter WebSocket closed',
        code,
        reason?.toString?.() || 'No reason'
      );
      this.isConnected = false;
      this.emit('disconnected', {
        code,
        reason: reason?.toString?.() || 'No reason',
      });

      // Attempt to reconnect
      this.attemptReconnect();
    });

    this.ws.on('error', (error: Error) => {
      console.error('Twitter WebSocket error:', error);
      this.emit('error', error);
    });
  }

  private handleMessage(buf: Buffer): void {
    let msg: TwitterWebSocketMessage;
    try {
      msg = JSON.parse(buf.toString()) as TwitterWebSocketMessage;
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
      // Handle heartbeat
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

  private normalizeTweet(
    tweet: TwitterRawTweet,
    originalMessage: TwitterWebSocketMessage
  ): TweetDetails {
    const author = tweet.author || {};
    const userName = (author as { userName?: string }).userName || '';

    return {
      tweetId: tweet.id,
      text: tweet.text,
      createdAt: tweet.createdAt,
      authorId: (author as { id?: string }).id || '',
      authorUsername: userName,
      authorName: (author as { name?: string }).name || '',
      authorAvatarURL: (author as { profilePicture?: string }).profilePicture || '',
      isRetweet: !!tweet.retweeted_tweet,
      isReply: !!tweet.isReply,
      likeCount: tweet.likeCount || 0,
      retweetCount: tweet.retweetCount || 0,
      replyCount: tweet.replyCount || 0,
      url: (author as { twitterUrl?: string }).twitterUrl || '',
      receivedAtMs: originalMessage.timestamp,
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        '❌ Max reconnection attempts reached. Manual intervention required.'
      );
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
  forceReconnect(): void {
    console.log('🔄 Force reconnect requested - resetting attempts...');
    this.reconnectAttempts = 0;
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.isConnected = false;
  }

  getConnectionStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    readyState: number | null;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.ws ? this.ws.readyState : null,
    };
  }
}

export default TwitterWebSocketService;

