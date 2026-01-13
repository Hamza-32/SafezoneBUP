// Simple database viewer
const mysql = require('mysql2/promise');

async function viewData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'safezone_db'
  });

  try {
    console.log('=== SAFEZONE DATABASE ===\n');

    // Users
    console.log('USERS:');
    const [users] = await connection.execute('SELECT * FROM users');
    users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    });

    // Emergency Reports
    console.log('\nEMERGENCY REPORTS:');
    const [emergencies] = await connection.execute('SELECT * FROM emergency_reports');
    emergencies.forEach(report => {
      console.log(`- ${report.title} | Category: ${report.category} | Status: ${report.status}`);
    });

    // Complaints
    console.log('\nCOMPLAINTS:');
    const [complaints] = await connection.execute('SELECT * FROM complaints');
    complaints.forEach(complaint => {
      console.log(`- ${complaint.title} | Category: ${complaint.category} | Status: ${complaint.status}`);
    });

    console.log('\n=== END ===');

  } finally {
    await connection.end();
  }
}

viewData().catch(console.error);
