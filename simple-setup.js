// Direct database setup without tsx or TypeScript
const mysql = require('mysql2/promise');

async function main() {
  console.log('🚀 Starting database setup...');
  
  let connection;
  
  try {
    // Connect to MySQL
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      port: 3306
    });
    
    console.log('✅ Connected to MySQL');
    
    // Create database
    await connection.execute('CREATE DATABASE IF NOT EXISTS safezone_db');
    console.log('✅ Database created');
    
    // Use database
    await connection.execute('USE safezone_db');
    console.log('✅ Using safezone_db');
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        role ENUM('student', 'admin', 'security') DEFAULT 'student',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');
    
    // Show tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables in database:', tables.length);
    
    console.log('🎉 Setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

main();
