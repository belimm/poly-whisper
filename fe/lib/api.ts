import { supabase } from './supabase';
import { TweetsResponse, MarketsResponse } from './types';

class PolyWhisperAPI {
   /**
    * Fetch tweets with AI analysis
    */
   async getTweetsWithAnalysis(
      limit = 20,
      offset = 0
   ): Promise<TweetsResponse> {
      const response = await fetch(
         `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/with-analysis?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
         if (response.status === 401) {
            throw new Error('Authentication failed');
         }
         throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched tweets:', data);
      return data;
   }

   /**
    * Find Polymarket markets for a specific tweet
    */
   async findMarketsForTweet(
      tweetId: string,
      q?: number,
      qc?: number
   ): Promise<MarketsResponse> {
      const queryParams = new URLSearchParams();

      if (q !== undefined) {
         queryParams.append('q', q.toString());
      }

      if (qc !== undefined) {
         queryParams.append('qc', qc.toString());
      }

      const queryString = queryParams.toString();
      const url = `${
         process.env.NEXT_PUBLIC_API_URL
      }/api/tweets/${tweetId}/findMarkets${
         queryString ? `?${queryString}` : ''
      }`;

      const response = await fetch(url);

      if (!response.ok) {
         if (response.status === 404) {
            throw new Error('Tweet not found');
         }
         if (response.status === 401) {
            throw new Error('Authentication failed');
         }
         throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
   }
}

export const api = new PolyWhisperAPI();

