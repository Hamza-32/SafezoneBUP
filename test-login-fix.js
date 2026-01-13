// Test login functionality
const baseUrl = 'http://localhost:3005';

async function testLogin() {
  console.log('🧪 Testing login functionality...\n');
  
  // Test with the test user we created earlier
  const loginData = {
    email: 'finaltest@example.com',
    password: 'password123'
  };

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('Response structure:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.data && result.data.user) {
        console.log('\n📋 User Details:');
        console.log(`   Name: ${result.data.user.firstName} ${result.data.user.lastName}`);
        console.log(`   Email: ${result.data.user.email}`);
        console.log(`   Role: ${result.data.user.role}`);
        console.log(`   Student ID: ${result.data.user.studentId || 'N/A'}`);
      }
    } else {
      console.log('❌ Login failed:', result);
    }
  } catch (error) {
    console.error('❌ Error during login test:', error.message);
  }
}

testLogin().catch(console.error);
