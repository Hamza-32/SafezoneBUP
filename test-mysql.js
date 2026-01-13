const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('🔍 Testing MySQL connection...');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'safezone_db',
    port: parseInt(process.env.DB_PORT || '3306'),
  };

  console.log('Connection config:', {
    host: config.host,
    user: config.user,
    database: config.database,
    port: config.port,
    password: config.password ? '[SET]' : '[EMPTY]'
  });

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL successfully!');
    
    const [results] = await connection.execute('SELECT VERSION() as version');
    console.log('MySQL Version:', results[0].version);
    
    await connection.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();
