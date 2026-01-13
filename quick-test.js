console.log('Starting database test...');

const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function quickTest() {
  console.log('Environment variables:');
  console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
  console.log('DB_USER:', process.env.DB_USER || 'root');
  console.log('DB_NAME:', process.env.DB_NAME || 'safezone_db');
  console.log('DB_PORT:', process.env.DB_PORT || '3306');
  
  try {
    console.log('Attempting to connect to MySQL...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Connected to MySQL server successfully!');
    
    // Check if database exists
    const [databases] = await connection.execute('SHOW DATABASES LIKE ?', ['safezone_db']);
    if (databases.length === 0) {
      console.log('Creating database safezone_db...');
      await connection.execute('CREATE DATABASE safezone_db');
      console.log('✅ Database created successfully!');
    } else {
      console.log('✅ Database safezone_db already exists');
    }
    
    await connection.end();
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
  }
}

quickTest();
