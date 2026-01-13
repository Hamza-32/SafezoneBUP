// Test script to verify signup functionality
const https = require('https');

const baseUrl = 'http://localhost:3004';

async function testSignup() {
  console.log('Testing signup API...');
  
  const userData = {
    firstName: 'Test',
    lastName: 'User2',
    email: 'test2@example.com',
    password: 'password123',
    role: 'student',
    studentId: 'ST12346',
    phoneNumber: '1234567890'
  };

  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Signup successful!');
      console.log('Response:', data);
    } else {
      console.log('❌ Signup failed:', data);
    }
  } catch (error) {
    console.error('❌ Error during signup:', error.message);
  }
}

// Test login as well
async function testLogin() {
  console.log('\nTesting login API...');
  
  const loginData = {
    email: 'test2@example.com',
    password: 'password123'
  };

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('Response:', data);
    } else {
      console.log('❌ Login failed:', data);
    }
  } catch (error) {
    console.error('❌ Error during login:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting SafeZone signup/login tests...\n');
  await testSignup();
  await testLogin();
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);
