// Database explorer script
const mysql = require('mysql2/promise');

async function exploreDatabase() {
  console.log('🔍 Exploring SafeZone Database...\n');
  
  let connection;

  try {
    // Connect to the database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Update if needed
      port: 3306,
      database: 'safezone_db'
    });
    
    console.log('✅ Connected to safezone_db\n');

    // Show all tables
    console.log('📋 Tables in safezone_db:');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${Object.values(table)[0]}`);
    });

    console.log('\n👥 Users table:');
    const [users] = await connection.execute('SELECT id, firstName, lastName, email, role, createdAt FROM users LIMIT 10');
    console.table(users);

    console.log('\n🚨 Emergency Reports:');
    const [emergencies] = await connection.execute('SELECT id, title, category, status, priority, createdAt FROM emergency_reports LIMIT 5');
    console.table(emergencies);

    console.log('\n📝 Complaints:');
    const [complaints] = await connection.execute('SELECT id, title, category, status, priority, createdAt FROM complaints LIMIT 5');
    console.table(complaints);

    console.log('\n📊 Database Statistics:');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [emergencyCount] = await connection.execute('SELECT COUNT(*) as count FROM emergency_reports');
    const [complaintCount] = await connection.execute('SELECT COUNT(*) as count FROM complaints');
    const [notificationCount] = await connection.execute('SELECT COUNT(*) as count FROM notifications');

    console.log(`- Users: ${userCount[0].count}`);
    console.log(`- Emergency Reports: ${emergencyCount[0].count}`);
    console.log(`- Complaints: ${complaintCount[0].count}`);
    console.log(`- Notifications: ${notificationCount[0].count}`);

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

exploreDatabase();
