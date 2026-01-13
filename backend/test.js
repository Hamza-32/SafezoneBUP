const { Database } = require('./database/connection');

async function testBackend() {
  console.log('🧪 Testing SafeZone Backend...');
  
  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    const isConnected = await Database.testConnection();
    
    if (!isConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    // Test basic queries
    console.log('🔍 Testing basic database operations...');
    
    // Test users table
    const users = await Database.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users table: ${users[0].count} records`);
    
    // Test emergency_reports table
    const emergencies = await Database.query('SELECT COUNT(*) as count FROM emergency_reports');
    console.log(`✅ Emergency reports table: ${emergencies[0].count} records`);
    
    // Test complaints table
    const complaints = await Database.query('SELECT COUNT(*) as count FROM complaints');
    console.log(`✅ Complaints table: ${complaints[0].count} records`);
    
    // Test system_settings table
    const settings = await Database.query('SELECT COUNT(*) as count FROM system_settings');
    console.log(`✅ System settings table: ${settings[0].count} records`);
    
    console.log('');
    console.log('🎉 Backend test completed successfully!');
    console.log('✅ Database is properly configured and seeded');
    console.log('✅ All tables are accessible');
    console.log('');
    console.log('You can now start the server with: npm run dev:backend');
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    console.error('');
    console.error('Please check:');
    console.error('1. MySQL server is running');
    console.error('2. Database credentials in backend/.env are correct');
    console.error('3. Database has been set up (npm run db:setup)');
    console.error('4. Database has been seeded (npm run db:seed)');
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testBackend()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testBackend };
