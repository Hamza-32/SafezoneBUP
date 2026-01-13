// Interactive database query script
const mysql = require('mysql2/promise');

async function queryDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '',
    port: 3306,
    database: 'safezone_db'
  });

  try {
    console.log('🔍 SafeZone Database Interactive Query\n');

    // You can modify these queries as needed
    console.log('📋 All Users:');
    const [users] = await connection.execute(`
      SELECT id, firstName, lastName, email, role, 
             DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i') as joined 
      FROM users ORDER BY id
    `);
    console.table(users);

    console.log('\n🚨 Emergency Reports with User Info:');
    const [emergencies] = await connection.execute(`
      SELECT 
        er.id, er.title, er.category, er.status, er.priority,
        CONCAT(u.firstName, ' ', u.lastName) as reporter,
        DATE_FORMAT(er.createdAt, '%Y-%m-%d %H:%i') as reported
      FROM emergency_reports er
      LEFT JOIN users u ON er.userId = u.id
      ORDER BY er.createdAt DESC
    `);
    console.table(emergencies);

    console.log('\n📝 Complaints with User Info:');
    const [complaints] = await connection.execute(`
      SELECT 
        c.id, c.title, c.category, c.status, c.priority,
        CONCAT(u.firstName, ' ', u.lastName) as complainant,
        DATE_FORMAT(c.createdAt, '%Y-%m-%d %H:%i') as submitted
      FROM complaints c
      LEFT JOIN users u ON c.userId = u.id
      ORDER BY c.createdAt DESC
    `);
    console.table(complaints);

  } finally {
    await connection.end();
  }
}

queryDatabase().catch(console.error);
