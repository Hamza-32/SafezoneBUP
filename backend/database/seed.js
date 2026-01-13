const { Database } = require('./connection');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const seedData = async () => {
  try {
    console.log('🌱 Seeding SafeZone database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await Database.query(`
      INSERT IGNORE INTO users (name, email, password, role, phone, department, is_verified) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'System Administrator',
      'admin@safezone.edu',
      adminPassword,
      'admin',
      '555-0100',
      'IT Administration',
      true
    ]);

    // Create sample student users
    const studentPassword = await bcrypt.hash('student123', 10);
    const students = [
      {
        name: 'John Doe',
        email: 'john.doe@student.edu',
        student_id: 'STU2024001',
        phone: '555-1001',
        department: 'Computer Science',
        year: 3
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@student.edu',
        student_id: 'STU2024002',
        phone: '555-1002',
        department: 'Engineering',
        year: 2
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@student.edu',
        student_id: 'STU2024003',
        phone: '555-1003',
        department: 'Business',
        year: 4
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah.wilson@student.edu',
        student_id: 'STU2024004',
        phone: '555-1004',
        department: 'Arts',
        year: 1
      }
    ];

    for (const student of students) {
      await Database.query(`
        INSERT IGNORE INTO users (name, email, password, role, student_id, phone, department, year, is_verified) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        student.name,
        student.email,
        studentPassword,
        'student',
        student.student_id,
        student.phone,
        student.department,
        student.year,
        true
      ]);
    }

    // Create sample emergency reports
    const emergencyReports = [
      {
        reference_id: 'EMG001',
        user_id: 2,
        emergency_type: 'Medical Emergency',
        location: 'Library Building, 2nd Floor',
        description: 'Student collapsed in the library during study session. Appears to be unconscious.',
        contact_number: '555-1001',
        status: 'resolved',
        priority: 'critical'
      },
      {
        reference_id: 'EMG002',
        user_id: 3,
        emergency_type: 'Security Incident',
        location: 'Parking Lot C',
        description: 'Suspicious individual loitering around parked cars, potentially attempting break-ins.',
        contact_number: '555-1002',
        status: 'in_progress',
        priority: 'high'
      },
      {
        reference_id: 'EMG003',
        user_id: null,
        emergency_type: 'Fire Emergency',
        location: 'Chemistry Lab, Science Building',
        description: 'Small fire detected in chemistry lab. Students evacuated safely.',
        contact_number: '555-0000',
        is_anonymous: true,
        status: 'resolved',
        priority: 'critical'
      }
    ];

    for (const report of emergencyReports) {
      await Database.query(`
        INSERT IGNORE INTO emergency_reports 
        (reference_id, user_id, emergency_type, location, description, contact_number, is_anonymous, status, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        report.reference_id,
        report.user_id,
        report.emergency_type,
        report.location,
        report.description,
        report.contact_number,
        report.is_anonymous || false,
        report.status,
        report.priority
      ]);
    }

    // Create sample complaints
    const complaints = [
      {
        reference_id: 'CPL001',
        user_id: 2,
        title: 'Broken Air Conditioning in Dormitory',
        category: 'Infrastructure',
        description: 'The air conditioning unit in Room 205 has been broken for over a week. It\'s getting very hot and uncomfortable.',
        location: 'Dormitory Block A, Room 205',
        status: 'under_review',
        priority: 'medium'
      },
      {
        reference_id: 'CPL002',
        user_id: 4,
        title: 'Poor Lighting in Parking Area',
        category: 'Safety',
        description: 'The parking area behind the sports complex is very poorly lit at night, making it unsafe for students.',
        location: 'Sports Complex Parking Area',
        status: 'pending',
        priority: 'high'
      },
      {
        reference_id: 'CPL003',
        user_id: null,
        title: 'Harassment Incident',
        category: 'Security',
        description: 'Witnessed inappropriate behavior and harassment near the cafeteria during lunch hours.',
        location: 'Cafeteria Area',
        is_anonymous: true,
        status: 'resolved',
        priority: 'high'
      }
    ];

    for (const complaint of complaints) {
      await Database.query(`
        INSERT IGNORE INTO complaints 
        (reference_id, user_id, title, category, description, location, is_anonymous, status, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        complaint.reference_id,
        complaint.user_id,
        complaint.title,
        complaint.category,
        complaint.description,
        complaint.location,
        complaint.is_anonymous || false,
        complaint.status,
        complaint.priority
      ]);
    }

    // Create sample notifications
    const notifications = [
      {
        user_id: 2,
        title: 'Emergency Report Update',
        message: 'Your emergency report EMG001 has been resolved. Medical team responded within 5 minutes.',
        type: 'emergency',
        related_id: 1,
        related_type: 'emergency_report'
      },
      {
        user_id: 3,
        title: 'Security Alert',
        message: 'Security incident in Parking Lot C is being investigated. Increased security presence deployed.',
        type: 'emergency',
        related_id: 2,
        related_type: 'emergency_report'
      },
      {
        user_id: 4,
        title: 'Complaint Acknowledged',
        message: 'Your complaint about poor lighting has been received and is under review by facilities management.',
        type: 'complaint',
        related_id: 2,
        related_type: 'complaint'
      }
    ];

    for (const notification of notifications) {
      await Database.query(`
        INSERT IGNORE INTO notifications 
        (user_id, title, message, type, related_id, related_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        notification.user_id,
        notification.title,
        notification.message,
        notification.type,
        notification.related_id,
        notification.related_type
      ]);
    }

    console.log('✅ Sample data seeded successfully!');
    console.log('\n📊 Seeded data summary:');
    console.log('• 1 Admin user (admin@safezone.edu / admin123)');
    console.log('• 4 Student users (password: student123)');
    console.log('• 3 Emergency reports');
    console.log('• 3 Complaints');
    console.log('• 3 Notifications');
    console.log('• Default emergency contacts');
    console.log('• System settings');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Run seed if called directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };
