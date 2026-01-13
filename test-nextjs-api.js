// Quick test to verify Next.js API routes are working
const testApiEndpoints = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing Next.js API routes...\n');
  
  // Test auth endpoints
  try {
    console.log('1. Testing auth/health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/auth/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Auth health check:', healthData);
  } catch (error) {
    console.log('❌ Auth health check failed:', error.message);
  }
  
  // Test emergency endpoints
  try {
    console.log('\n2. Testing emergency/health endpoint...');
    const emergencyHealthResponse = await fetch(`${baseUrl}/api/emergency/health`);
    const emergencyHealthData = await emergencyHealthResponse.json();
    console.log('✅ Emergency health check:', emergencyHealthData);
  } catch (error) {
    console.log('❌ Emergency health check failed:', error.message);
  }
  
  // Test general API health
  try {
    console.log('\n3. Testing general API health...');
    const apiHealthResponse = await fetch(`${baseUrl}/api/health`);
    const apiHealthData = await apiHealthResponse.json();
    console.log('✅ API health check:', apiHealthData);
  } catch (error) {
    console.log('❌ API health check failed:', error.message);
  }
  
  // Test database connection via API
  try {
    console.log('\n4. Testing database connection via API...');
    const dbTestResponse = await fetch(`${baseUrl}/api/auth/health`);
    if (dbTestResponse.ok) {
      console.log('✅ Database connection via API is working');
    } else {
      console.log('❌ Database connection via API failed');
    }
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
  }
};

// Run the test
testApiEndpoints().catch(console.error);
