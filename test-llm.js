// test-llm.js - Simple test for Google AI integration
import dotenv from 'dotenv';
import GoogleAIClient from './src/services/llmClient.js';

dotenv.config();

async function testLLM() {
  try {
    console.log('Testing Google AI integration...');
    
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
      console.log('⚠️  No GEMINI_API_KEY found in environment. Set it to test LLM functionality.');
      return;
    }

    const client = new GoogleAIClient();
    const testTweet = "Bitcoin just hit $45,000! This could be huge for crypto markets. Elon Musk tweeted about it too.";
    
    console.log('🐦 Test tweet:', testTweet);
    console.log('🤖 Analyzing with LLM...\n');
    
    const result = await client.analyzeTweet(testTweet);
    
    console.log('📊 LLM Analysis Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLLM();