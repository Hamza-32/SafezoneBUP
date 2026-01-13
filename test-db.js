// Simple test file to check database connection
import { Database } from './database';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const isConnected = await Database.testConnection();
    if (isConnected) {
      console.log('✅ Database connection successful!');
    } else {
      console.log('❌ Database connection failed!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await Database.closePool();
  }
}

testConnection();
