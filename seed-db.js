const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function seedDatabase() {
  console.log('🌱 Starting SafeZone Database Seeding...\n');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'safezone_db',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  let connection;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database successfully!\n');

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(`
      INSERT IGNORE INTO users (firstName, lastName, email, password, role, phoneNumber, isVerified) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'System',
      'Administrator',
      'admin@safezone.edu',
      adminPassword,
      'admin',
      '555-0100',
      true
    ]);
    console.log('✅ Admin user created');

    // Create sample student users
    console.log('👥 Creating student users...');
    const studentPassword = await bcrypt.hash('student123', 10);
    const students = [
      { firstName: 'John', lastName: 'Doe', email: 'john.doe@student.edu', studentId: 'STU2024001', phoneNumber: '555-1001' },
      { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@student.edu', studentId: 'STU2024002', phoneNumber: '555-1002' },
      { firstName: 'Mike', lastName: 'Johnson', email: 'mike.johnson@student.edu', studentId: 'STU2024003', phoneNumber: '555-1003' },
      { firstName: 'Sarah', lastName: 'Wilson', email: 'sarah.wilson@student.edu', studentId: 'STU2024004', phoneNumber: '555-1004' }
    ];

    for (const student of students) {
      await connection.execute(`
        INSERT IGNORE INTO users (firstName, lastName, email, password, role, studentId, phoneNumber, isVerified) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        student.firstName,
        student.lastName,
        student.email,
        studentPassword,
        'student',
        student.studentId,
        student.phoneNumber,
        true
      ]);
    }
    console.log('✅ Student users created');

    // Create sample emergency reports
    console.log('🚨 Creating emergency reports...');
    const emergencyReports = [
      {
        userId: 2,
        title: 'Medical Emergency in Library',
        description: 'Student collapsed in the library during study session. Appears to be unconscious.',
        category: 'medical',
        location: 'Library Building, 2nd Floor',
        status: 'resolved',
        priority: 'critical'
      },
      {
        userId: 3,
        title: 'Security Incident in Parking',
        description: 'Suspicious individual loitering around parked cars, potentially attempting break-ins.',
        category: 'security',
        location: 'Parking Lot C',
        status: 'investigating',
        priority: 'high'
      }
    ];

    for (const report of emergencyReports) {
      await connection.execute(`
        INSERT IGNORE INTO emergency_reports 
        (userId, title, description, category, location, status, priority, isAnonymous)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        report.userId,
        report.title,
        report.description,
        report.category,
        report.location,
        report.status,
        report.priority,
        false
      ]);
    }
    console.log('✅ Emergency reports created');

    // Create sample complaints
    console.log('📝 Creating complaints...');
    const complaints = [
      {
        userId: 2,
        title: 'Broken Air Conditioning',
        description: 'The air conditioning unit in Room 205 has been broken for over a week.',
        category: 'facility',
        location: 'Dormitory Block A, Room 205',
        status: 'investigating',
        priority: 'medium'
      },
      {
        userId: 4,
        title: 'Poor Lighting in Parking',
        description: 'The parking area is very poorly lit at night, making it unsafe.',
        category: 'facility',
        location: 'Sports Complex Parking Area',
        status: 'pending',
        priority: 'high'
      }
    ];

    for (const complaint of complaints) {
      await connection.execute(`
        INSERT IGNORE INTO complaints 
        (userId, title, description, category, location, status, priority, isAnonymous)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        complaint.userId,
        complaint.title,
        complaint.description,
        complaint.category,
        complaint.location,
        complaint.status,
        complaint.priority,
        false
      ]);
    }
    console.log('✅ Complaints created');

    // Create emergency contacts
    console.log('📞 Creating emergency contacts...');
    const emergencyContacts = [
      { name: 'Campus Security', phoneNumber: '555-SECURITY', email: 'security@safezone.edu', department: 'Security', displayOrder: 1 },
      { name: 'Medical Emergency', phoneNumber: '555-MEDICAL', email: 'medical@safezone.edu', department: 'Health Services', displayOrder: 2 },
      { name: 'Fire Department', phoneNumber: '555-FIRE', email: 'fire@safezone.edu', department: 'Safety', displayOrder: 3 },
      { name: 'Counseling Services', phoneNumber: '555-COUNSEL', email: 'counseling@safezone.edu', department: 'Student Services', displayOrder: 4 }
    ];

    for (const contact of emergencyContacts) {
      await connection.execute(`
        INSERT IGNORE INTO emergency_contacts 
        (name, phoneNumber, email, department, isActive, displayOrder)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        contact.name,
        contact.phoneNumber,
        contact.email,
        contact.department,
        true,
        contact.displayOrder
      ]);
    }
    console.log('✅ Emergency contacts created');

    // Show summary
    console.log('\n📊 Database Seeding Summary:');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [reportCount] = await connection.execute('SELECT COUNT(*) as count FROM emergency_reports');
    const [complaintCount] = await connection.execute('SELECT COUNT(*) as count FROM complaints');
    const [contactCount] = await connection.execute('SELECT COUNT(*) as count FROM emergency_contacts');

    console.log(`✅ ${userCount[0].count} users created`);
    console.log(`✅ ${reportCount[0].count} emergency reports created`);
    console.log(`✅ ${complaintCount[0].count} complaints created`);
    console.log(`✅ ${contactCount[0].count} emergency contacts created`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Default Login Credentials:');
    console.log('Admin: admin@safezone.edu / admin123');
    console.log('Students: john.doe@student.edu / student123 (and others)');

  } catch (error) {
    console.error('\n❌ Database seeding failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

seedDatabase();
