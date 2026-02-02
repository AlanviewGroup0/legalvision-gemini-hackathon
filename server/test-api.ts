/**
 * Simple API test script
 * Run with: bun run test-api.ts
 */

const BASE_URL = 'http://localhost:3000';

async function testHealth() {
  console.log('\n🏥 Testing Health Endpoint...');
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  return response.ok;
}

async function testCreateAnalysis(url: string, analysisType = 'comprehensive') {
  console.log(`\n📊 Creating Analysis Job for: ${url}...`);
  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, analysisType }),
  });
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  if (data.success && data.data?.jobId) {
    return data.data.jobId;
  }
  return null;
}

async function testGetJobStatus(jobId: string) {
  console.log(`\n🔍 Checking Job Status: ${jobId}...`);
  const response = await fetch(`${BASE_URL}/api/analyze/${jobId}`);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  return data;
}

async function testListAnalyses(limit = 5) {
  console.log(`\n📋 Listing Analyses (limit: ${limit})...`);
  const response = await fetch(`${BASE_URL}/api/analyze?limit=${limit}`);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  console.log('🚀 Starting API Tests...\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Health Check
    const healthOk = await testHealth();
    if (!healthOk) {
      console.error('❌ Health check failed!');
      return;
    }

    // Test 2: Create Analysis Job
    const jobId = await testCreateAnalysis('https://example.com', 'comprehensive');
    if (!jobId) {
      console.error('❌ Failed to create analysis job!');
      return;
    }

    // Test 3: Check Job Status (immediately - might be PENDING)
    await testGetJobStatus(jobId);

    // Test 4: Wait a bit and check again
    console.log('\n⏳ Waiting 3 seconds for job to process...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await testGetJobStatus(jobId);

    // Test 5: List Analyses
    await testListAnalyses(5);

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
    console.log(`\n💡 Tip: Check job status again with:`);
    console.log(`   bun run test-api.ts --jobId ${jobId}`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Check if jobId is provided as argument
const args = process.argv.slice(2);
if (args.includes('--jobId')) {
  const jobIdIndex = args.indexOf('--jobId');
  const jobId = args[jobIdIndex + 1];
  if (jobId) {
    testGetJobStatus(jobId).catch(console.error);
  } else {
    console.error('❌ Please provide a jobId: bun run test-api.ts --jobId <jobId>');
  }
} else {
  main().catch(console.error);
}
