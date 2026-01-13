// Simple database test without dotenv
const mysql = require('mysql2/promise');

async function simpleTest() {
  console.log('🔍 Testing MySQL connection...');
  
  try {
    // Try connecting with actual values from .env.local
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '12345', // Using the password from .env.local
      port: 3306
    });
    
    console.log('✅ Connected to MySQL successfully!');
    
    // Check MySQL version
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log('MySQL Version:', rows[0].version);
      // Check if database exists
    const [databases] = await connection.execute("SHOW DATABASES LIKE 'safezone_db'");
    if (databases.length === 0) {
      console.log('📝 Creating database safezone_db...');
      await connection.execute('CREATE DATABASE safezone_db');
      console.log('✅ Database created!');
    } else {
      console.log('✅ Database safezone_db exists');
    }
    
    await connection.end();
    console.log('🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 SOLUTION: MySQL server is not running.');
      console.log('Start MySQL with: net start mysql80 (or your MySQL service name)');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('');
      console.log('🔧 SOLUTION: Wrong MySQL credentials.');
      console.log('Update the password in this file if needed.');
    }
  }
}

simpleTest();
