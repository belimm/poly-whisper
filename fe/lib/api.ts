import { supabase } from './supabase'
import { TweetsResponse, MarketsResponse } from './types'

class PolyWhisperAPI {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Fetch tweets with AI analysis
   */
  async getTweetsWithAnalysis(limit = 20, offset = 0): Promise<TweetsResponse> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/with-analysis?limit=${limit}&offset=${offset}`,
      { headers }
    )
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed')
      }
      throw new Error(`HTTP ${response.status}`)
    }
    
    return response.json()
  }

  /**
   * Find Polymarket markets for a specific tweet
   */
  async findMarketsForTweet(tweetId: string): Promise<MarketsResponse> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tweets/${tweetId}/findMarkets`,
      { headers }
    )
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Tweet not found')
      }
      if (response.status === 401) {
        throw new Error('Authentication failed')
      }
      throw new Error(`HTTP ${response.status}`)
    }
    
    return response.json()
  }
}

export const api = new PolyWhisperAPI()

