const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🚀 Starting SafeZone Database Setup...\n');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  };

  console.log('📋 Connection Config:');
  console.log(`Host: ${config.host}`);
  console.log(`User: ${config.user}`);
  console.log(`Port: ${config.port}`);
  console.log(`Password: ${config.password ? '[SET]' : '[EMPTY]'}\n`);

  let connection;

  try {
    // Step 1: Connect to MySQL server (without database)
    console.log('🔌 Connecting to MySQL server...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server successfully!\n');

    // Step 2: Create database if it doesn't exist
    console.log('🗃️ Creating database...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS safezone_db');
    console.log('✅ Database "safezone_db" created/verified\n');

    // Step 3: Use the database
    await connection.execute('USE safezone_db');
    console.log('✅ Using database "safezone_db"\n');

    // Step 4: Create tables
    console.log('📝 Creating tables...');

    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        studentId VARCHAR(50) UNIQUE,
        phoneNumber VARCHAR(20),
        role ENUM('student', 'admin', 'security') DEFAULT 'student',
        isVerified BOOLEAN DEFAULT FALSE,
        profileImage VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Emergency reports table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS emergency_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category ENUM('medical', 'security', 'fire', 'other') NOT NULL,
        location VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        status ENUM('pending', 'investigating', 'resolved', 'closed') DEFAULT 'pending',
        priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        isAnonymous BOOLEAN DEFAULT FALSE,
        attachments JSON,
        adminNotes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Emergency reports table created');

    // Complaints table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category ENUM('facility', 'service', 'academic', 'harassment', 'other') NOT NULL,
        location VARCHAR(255),
        status ENUM('pending', 'investigating', 'resolved', 'closed') DEFAULT 'pending',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        isAnonymous BOOLEAN DEFAULT FALSE,
        attachments JSON,
        adminResponse TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Complaints table created');

    // Notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
        isRead BOOLEAN DEFAULT FALSE,
        relatedId INT,
        relatedType ENUM('emergency', 'complaint', 'system'),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Notifications table created');

    // Audit logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        action VARCHAR(255) NOT NULL,
        tableName VARCHAR(100),
        recordId INT,
        oldValues JSON,
        newValues JSON,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Audit logs table created');

    // System settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        settingKey VARCHAR(255) UNIQUE NOT NULL,
        settingValue TEXT,
        description TEXT,
        category VARCHAR(100),
        isPublic BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ System settings table created');

    // Emergency contacts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phoneNumber VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        department VARCHAR(100),
        isActive BOOLEAN DEFAULT TRUE,
        displayOrder INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Emergency contacts table created');

    // Step 5: Create indexes
    console.log('\n📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_studentId ON users(studentId)',
      'CREATE INDEX IF NOT EXISTS idx_emergency_reports_userId ON emergency_reports(userId)',
      'CREATE INDEX IF NOT EXISTS idx_emergency_reports_status ON emergency_reports(status)',
      'CREATE INDEX IF NOT EXISTS idx_emergency_reports_created ON emergency_reports(createdAt)',
      'CREATE INDEX IF NOT EXISTS idx_complaints_userId ON complaints(userId)',
      'CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications(isRead)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs(userId)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(createdAt)'
    ];

    for (const indexQuery of indexes) {
      try {
        await connection.execute(indexQuery);
      } catch (err) {
        // Ignore errors for existing indexes
        if (!err.message.includes('Duplicate key name')) {
          console.warn(`⚠️ Index creation warning: ${err.message}`);
        }
      }
    }
    console.log('✅ Indexes created/verified');

    // Step 6: Show table summary
    console.log('\n📋 Database Summary:');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`✅ ${tables.length} tables created:`);
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run db:seed (to add sample data)');
    console.log('2. Run: npm run dev (to start the application)');

  } catch (error) {
    console.error('\n❌ Database setup failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    // Common error solutions
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Solution: MySQL server is not running. Please start MySQL service.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔧 Solution: Check your MySQL username/password in .env.local file.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n🔧 Solution: Database connection issue. Check your MySQL configuration.');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

setupDatabase();
