// Test current user endpoint
const baseUrl = 'http://localhost:3005';

async function testCurrentUser() {
  console.log('🧪 Testing current user endpoint...\n');
  
  // First login to get token
  const loginData = {
    email: 'finaltest@example.com',
    password: 'password123'
  };

  try {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });

    const loginResult = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResult);
      return;
    }

    const token = loginResult.data.token;
    console.log('✅ Got token from login');

    // Test current user endpoint
    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const meResult = await meResponse.json();
    
    if (meResponse.ok) {
      console.log('✅ Current user endpoint successful!');
      console.log('Response structure:');
      console.log(JSON.stringify(meResult, null, 2));
    } else {
      console.log('❌ Current user failed:', meResult);
    }
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

testCurrentUser().catch(console.error);
