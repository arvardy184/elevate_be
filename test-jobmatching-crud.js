const axios = require('axios');

const BASE_URL = 'http://localhost:3009/api';

// User credentials for testing
const TEST_USER = {
  email: 'admin@example.com',
  password: 'password123'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

async function testJobMatchingHistory() {
  try {
    console.log('\n📜 Testing Job Matching History...');
    const response = await axios.get(`${BASE_URL}/job-matching/history`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Job Matching History Response:');
    console.log('Status:', response.data.status);
    console.log('Total:', response.data.pagination?.total || response.data.data.length);
    console.log('Data count:', response.data.data.length);
    
    if (response.data.data.length > 0) {
      console.log('First item:', {
        id: response.data.data[0].id,
        dreamJob: response.data.data[0].dreamJob,
        totalMatches: response.data.data[0].totalMatches,
        createdAt: response.data.data[0].createdAt
      });
      return response.data.data[0].id; // Return first job matching ID for testing
    }
    
    return null;
  } catch (error) {
    console.error('❌ Job Matching History error:', error.response?.data || error.message);
    return null;
  }
}

async function testJobMatchingById(jobMatchingId) {
  if (!jobMatchingId) {
    console.log('\n⚠️ Skipping Job Matching by ID test - no ID available');
    return;
  }

  try {
    console.log(`\n🔍 Testing Job Matching by ID: ${jobMatchingId}...`);
    const response = await axios.get(`${BASE_URL}/job-matching/${jobMatchingId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Job Matching Detail Response:');
    console.log('Status:', response.data.status);
    console.log('Data:', {
      id: response.data.data.id,
      dreamJob: response.data.data.dreamJob,
      totalMatches: response.data.data.totalMatches,
      hasCV: !!response.data.data.cvReview,
      createdAt: response.data.data.createdAt
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Job Matching by ID error:', error.response?.data || error.message);
    return null;
  }
}

async function testCreateJobMatching() {
  try {
    console.log('\n➕ Testing Create Job Matching...');
    const response = await axios.post(`${BASE_URL}/job-matching/match`, {
      dreamJob: 'AI Engineer Test'
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Create Job Matching Response:');
    console.log('Status:', response.data.status);
    console.log('Data:', {
      id: response.data.data.id,
      dreamJob: response.data.data.dreamJob,
      totalMatches: response.data.data.totalMatches
    });
    
    return response.data.data.id;
  } catch (error) {
    console.error('❌ Create Job Matching error:', error.response?.data || error.message);
    return null;
  }
}

async function testUpdateJobMatching(jobMatchingId) {
  if (!jobMatchingId) {
    console.log('\n⚠️ Skipping Update Job Matching test - no ID available');
    return;
  }

  try {
    console.log(`\n✏️ Testing Update Job Matching: ${jobMatchingId}...`);
    const response = await axios.put(`${BASE_URL}/job-matching/${jobMatchingId}`, {
      dreamJob: 'Senior AI Engineer Updated'
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Update Job Matching Response:');
    console.log('Status:', response.data.status);
    console.log('Data:', {
      id: response.data.data.id,
      dreamJob: response.data.data.dreamJob,
      totalMatches: response.data.data.totalMatches,
      updatedAt: response.data.data.updatedAt
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Update Job Matching error:', error.response?.data || error.message);
    return null;
  }
}

async function testDeleteJobMatching(jobMatchingId) {
  if (!jobMatchingId) {
    console.log('\n⚠️ Skipping Delete Job Matching test - no ID available');
    return;
  }

  try {
    console.log(`\n🗑️ Testing Delete Job Matching: ${jobMatchingId}...`);
    const response = await axios.delete(`${BASE_URL}/job-matching/${jobMatchingId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Delete Job Matching Response:');
    console.log('Status:', response.data.status);
    console.log('Message:', response.data.message);
    
    return true;
  } catch (error) {
    console.error('❌ Delete Job Matching error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing Job Matching CRUD endpoints...\n');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without login');
    return;
  }
  
  // Test History (List)
  const existingJobMatchingId = await testJobMatchingHistory();
  
  // Test Detail by ID
  await testJobMatchingById(existingJobMatchingId);
  
  // Test Create new job matching
  const newJobMatchingId = await testCreateJobMatching();
  
  // Test Update
  const updatedJobMatching = await testUpdateJobMatching(newJobMatchingId);
  
  // Test Delete (optional - uncomment if you want to delete the test data)
  // await testDeleteJobMatching(newJobMatchingId);
  
  console.log('\n🎉 Job Matching CRUD tests completed!');
}

// Run the tests
runTests().catch(console.error); 