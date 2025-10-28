// debug-websocket.js - Test Twitter WebSocket connection
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.TWITTERAPI_IO_KEY;
const WS_URL = process.env.WEBSOCKET_URL;

console.log('🔧 Debug TwitterAPI.io WebSocket Connection');
console.log('URL:', WS_URL ? `${WS_URL.substring(0, 30)}...` : 'NOT SET');
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 15)}...` : 'NOT SET');
console.log('');

if (!API_KEY || !WS_URL) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Test different authentication methods
const authMethods = [
  { name: 'x-api-key header', headers: { 'x-api-key': API_KEY } },
  { name: 'Authorization Bearer', headers: { 'Authorization': `Bearer ${API_KEY}` } },
  { name: 'Authorization API Key', headers: { 'Authorization': `API-Key ${API_KEY}` } },
  { name: 'api-key header', headers: { 'api-key': API_KEY } },
];

async function testConnection(method) {
  return new Promise((resolve) => {
    console.log(`🧪 Testing: ${method.name}`);
    
    const ws = new WebSocket(WS_URL, {
      headers: method.headers
    });

    const timeout = setTimeout(() => {
      ws.close();
      resolve({ success: false, error: 'Timeout after 10 seconds' });
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`✅ ${method.name}: Connection successful!`);
      ws.close();
      resolve({ success: true });
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ ${method.name}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      if (code !== 1000) {
        console.log(`❌ ${method.name}: Closed with code ${code} - ${reason?.toString() || 'Unknown reason'}`);
        resolve({ success: false, error: `Closed with code ${code}` });
      }
    });
  });
}

async function runTests() {
  console.log('🚀 Starting WebSocket authentication tests...\n');
  
  for (const method of authMethods) {
    await testConnection(method);
    console.log('');
    // Wait a bit between attempts
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🏁 Tests completed.');
  console.log('\n💡 If all tests fail:');
  console.log('  1. Check if your API key is valid in twitterapi.io dashboard');
  console.log('  2. Verify you have WebSocket access permissions');
  console.log('  3. Confirm the WebSocket URL is correct');
  console.log('  4. Contact twitterapi.io support if the issue persists');
}

runTests();