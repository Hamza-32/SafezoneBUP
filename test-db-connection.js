const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    // First, try to connect without database to create it
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '12345',
      port: 3306
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.execute('CREATE DATABASE IF NOT EXISTS safezone_db');
    console.log('✅ Database safezone_db created or already exists');
    
    await connection.end();
    
    // Now test connection to the specific database
    const dbConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '12345',
      database: 'safezone_db',
      port: 3306
    });
    
    console.log('✅ Connected to safezone_db database');
    await dbConnection.end();
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();
