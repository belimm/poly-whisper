// test-llm.js - Simple test for Google AI integration and retweet cleaning
import dotenv from 'dotenv';
import GoogleAIClient from '../src/services/llmClient.js';
import TweetAnalyzer from '../src/services/tweetAnalyzer.js';

dotenv.config();

async function testLLM() {
  try {
    console.log('Testing Google AI integration and retweet cleaning...\n');
    
    const analyzer = new TweetAnalyzer();
    
    // Test retweet cleaning
    const retweetText = "RT @amXFreeze: Grok 4 still ranks #1 on the FinSearchComp Benchmark\n\nIt's a first expert-level benchmark for financial search & reasoning…";
    const regularTweet = "Bitcoin just hit $45,000! This could be huge for crypto markets. Elon Musk tweeted about it too.";
    
    console.log('🧪 Testing retweet cleaning:');
    console.log('Original retweet:', retweetText);
    
    const heuristicResult = analyzer.analyzeTweet(retweetText);
    console.log('✅ Cleaned text:', heuristicResult.text);
    console.log('📝 Is retweet:', heuristicResult.isRetweet);
    console.log('🔑 Keywords found:', heuristicResult.keywords);
    console.log('');
    
    console.log('� Testing regular tweet:');
    console.log('Original tweet:', regularTweet);
    
    const regularResult = analyzer.analyzeTweet(regularTweet);
    console.log('✅ Text:', regularResult.text);
    console.log('📝 Is retweet:', regularResult.isRetweet);
    console.log('🔑 Keywords found:', regularResult.keywords);
    console.log('');
    
    // Test LLM if available
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
      console.log('🤖 Testing LLM analysis with cleaned retweet...\n');
      
      const llmResult = await analyzer.analyzeWithLLM(retweetText);
      console.log('📊 LLM Analysis Result for retweet:');
      console.log('✅ Cleaned text used:', llmResult.text);
      console.log('📝 Is retweet:', llmResult.isRetweet);
      console.log('🔑 Keywords:', llmResult.keywords);
      console.log('📂 Categories:', llmResult.categories);
      console.log('💭 Sentiment:', llmResult.sentiment);
      console.log('🎯 Confidence:', llmResult.confidence);
    } else {
      console.log('⚠️  No GEMINI_API_KEY found. LLM test skipped.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLLM();