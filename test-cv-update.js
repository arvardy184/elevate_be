const axios = require('axios');

const BASE_URL = 'http://localhost:3009/api';

// Test data
const TEST_USER = {
  email: 'admin@example.com',
  password: 'password123'
};

async function testCVUpdate() {
  try {
    console.log('🔐 Testing CV Review Update...');
    
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (!loginResponse.data.token) {
      console.log('❌ Login failed');
      return;
    }
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    
    // Get CV reviews first
    const reviewsResponse = await axios.get(`${BASE_URL}/cv-review/my-reviews`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 CV Reviews found:', reviewsResponse.data.data.length);
    
    if (reviewsResponse.data.data.length === 0) {
      console.log('⚠️ No CV reviews found to test update');
      return;
    }
    
    const cvId = reviewsResponse.data.data[0].id;
    console.log('🎯 Testing update for CV ID:', cvId);
    
    // Test update with proper Content-Type
    const updateResponse = await axios.put(`${BASE_URL}/cv-review/${cvId}`, {
      careerField: 'Data Scientist Updated'
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ CV Update Response:');
    console.log('Status:', updateResponse.data.status);
    console.log('New career field:', updateResponse.data.data.careerField);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run test
testCVUpdate(); 