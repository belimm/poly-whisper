// test-llm.js - Simple test for Google AI integration and retweet cleaning
import dotenv from 'dotenv';
import GoogleAIClient from '../src/infrastructure/client/llmClient.js'
import TweetAnalyzer from '../src/services/tweetAnalyzer.js';

dotenv.config();

async function testLLM() {
   try {
      console.log('Testing Google AI integration and retweet cleaning...\n');

      const analyzer = new TweetAnalyzer();

      const regularTweet =
         'Delaware needs to make major changes immediately or continue to lose its single biggest asset, which is being the incorporation state for most companies in America';

      // console.log('🧪 Testing retweet cleaning:');
      // console.log('Original retweet:', retweetText);

      // // Test retweet cleaning
      // const retweetText =
      //    "RT @amXFreeze: Grok 4 still ranks #1 on the FinSearchComp Benchmark\n\nIt's a first expert-level benchmark for financial search & reasoning…";

      // const heuristicResult = analyzer.analyzeTweet(retweetText);
      // console.log('✅ Cleaned text:', heuristicResult.text);
      // console.log('📝 Is retweet:', heuristicResult.isRetweet);
      // console.log('🔑 Keywords found:', heuristicResult.keywords);
      // console.log('');

      // console.log('� Testing regular tweet:');
      // console.log('Original tweet:', regularTweet);


      // Test LLM if available
      

         const llmResult = await analyzer.analyzeWithLLM(regularTweet);
         console.log(llmResult);
         // console.log('✅ Cleaned text used:', llmResult.text);
         // console.log('📝 Is retweet:', llmResult.isRetweet);
         // console.log('🔑 Keywords:', llmResult.keywords);
         // console.log('📂 Categories:', llmResult.categories);
         // console.log('💭 Sentiment:', llmResult.sentiment);
         // console.log('🎯 Confidence:', llmResult.confidence);
      
   } catch (error) {
      console.error('❌ Test failed:', error.message);
   }
}

testLLM();
