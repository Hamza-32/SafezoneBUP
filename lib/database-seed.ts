import { Database } from './database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_ROUNDS = 12;

/**
 * Password for the seeded administrator.
 *
 * A fixed password committed to the repository would be a known set of
 * administrator credentials on every deployment that ran the seed. So the
 * value comes from SEED_ADMIN_PASSWORD when set, and is otherwise random and
 * printed once for the operator to save.
 */
function resolveSeedAdminPassword(): { password: string; generated: boolean } {
  const provided = process.env.SEED_ADMIN_PASSWORD;

  if (provided && provided.length >= 10) {
    return { password: provided, generated: false };
  }

  if (provided) {
    console.warn('⚠️  SEED_ADMIN_PASSWORD is shorter than 10 characters and was ignored.');
  }

  return { password: crypto.randomBytes(12).toString('base64url'), generated: true };
}

export const seedData = async () => {
  try {
    console.log('🌱 Seeding SafezoneBUP database...');

    // Create admin user
    const admin = resolveSeedAdminPassword();
    const adminPassword = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);
    const adminInsert = await Database.query(`
      INSERT IGNORE INTO users (firstName, lastName, email, password, role, phoneNumber, isVerified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'System',
      'Administrator',
      'admin@bup.edu.bd',
      adminPassword,
      'admin',
      '+88024-9870-5700',
      true
    ]);

    // INSERT IGNORE is a no-op when the account already exists, in which
    // case the password above was never applied and must not be reported.
    const adminWasCreated = adminInsert?.affectedRows > 0;

    if (!adminWasCreated) {
      console.log('   Administrator admin@bup.edu.bd already exists, password left unchanged.');
    } else if (admin.generated) {
      console.log('');
      console.log('   Seeded administrator');
      console.log('     email:    admin@bup.edu.bd');
      console.log(`     password: ${admin.password}`);
      console.log('   Save this now. It is shown once and stored only as a hash.');
      console.log('   Set SEED_ADMIN_PASSWORD to choose the password yourself.');
      console.log('');
    } else {
      console.log('   Seeded administrator admin@bup.edu.bd using SEED_ADMIN_PASSWORD.');
    }

    // Create sample student users. These are demonstration accounts, so the
    // password is intentionally simple and is safe only because these rows
    // should never exist in a production database.
    const studentPassword = await bcrypt.hash('student123', BCRYPT_ROUNDS);
    const students = [
      {
        firstName: 'Rahman',
        lastName: 'Ahmed',
        email: 'rahman.ahmed@bup.edu.bd',
        studentId: 'BUP2024001',
        phoneNumber: '+88017-1234-5678'
      },
      {
        firstName: 'Fatima',
        lastName: 'Khan',
        email: 'fatima.khan@bup.edu.bd',
        studentId: 'BUP2024002',
        phoneNumber: '+88019-8765-4321'
      },
      {
        firstName: 'Imran',
        lastName: 'Hossain',
        email: 'imran.hossain@bup.edu.bd',
        studentId: 'BUP2024003',
        phoneNumber: '+88015-9876-5432'
      },
      {
        firstName: 'Tasneem',
        lastName: 'Rahman',
        email: 'tasneem.rahman@bup.edu.bd',
        studentId: 'BUP2024004',
        phoneNumber: '+88018-2468-1357'
      }
    ];

    for (const student of students) {
      await Database.query(`
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
    }    // Create sample emergency reports
    const emergencyReports = [
      {
        userId: 2,
        title: 'Medical Emergency in BUP Library',
        description: 'Student collapsed in the central library during study session. First aid provided.',
        category: 'medical',
        location: 'Central Library, 2nd Floor, Reading Hall',
        status: 'resolved',
        priority: 'critical',
        isAnonymous: false
      },
      {
        userId: 3,
        title: 'Security Incident in Campus Parking',
        description: 'Suspicious individual seen near faculty parking area. Security alerted.',
        category: 'security',
        location: 'Faculty Parking Area, Mirpur Campus',
        status: 'investigating',
        priority: 'high',
        isAnonymous: false
      },
      {
        userId: null,
        title: 'Fire Safety Alert in Computer Lab',
        description: 'Electrical short circuit in Computer Science Lab. Area evacuated safely.',
        category: 'fire',
        location: 'Computer Science Lab, Engineering Block',
        status: 'resolved',
        priority: 'critical',
        isAnonymous: true
      }
    ];

    for (const report of emergencyReports) {
      await Database.query(`
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
        report.isAnonymous
      ]);
    }    // Create sample complaints
    const complaints = [
      {
        userId: 2,
        title: 'Air Conditioning Issue in Hostel',
        description: 'The AC unit in Hostel Room 205 has been malfunctioning for a week. Very uncomfortable during hot weather.',
        category: 'facility',
        location: 'BUP Residential Hall, Room 205',
        status: 'investigating',
        priority: 'medium',
        isAnonymous: false
      },
      {
        userId: 4,
        title: 'Poor Lighting in Campus Parking',
        description: 'The parking area near the sports complex lacks proper lighting, creating safety concerns for evening students.',
        category: 'facility',
        location: 'Sports Complex Parking, BUP Mirpur Campus',
        status: 'pending',
        priority: 'high',
        isAnonymous: false
      },
      {
        userId: null,
        title: 'Inappropriate Behavior Incident',
        description: 'Witnessed harassment incident near the main cafeteria during lunch break. Immediate action needed.',
        category: 'harassment',
        location: 'Main Cafeteria, Ground Floor',
        status: 'resolved',
        priority: 'high',
        isAnonymous: true
      }
    ];

    for (const complaint of complaints) {
      await Database.query(`
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
        complaint.isAnonymous
      ]);
    }    // Create sample notifications
    const notifications = [
      {
        userId: 2,
        title: 'Emergency Report Update',
        message: 'Your emergency report has been resolved. Medical team responded within 5 minutes.',
        type: 'success',
        relatedId: 1,
        relatedType: 'emergency'
      },
      {
        userId: 3,
        title: 'Security Alert',
        message: 'Security incident in Parking Lot C is being investigated. Increased security presence deployed.',
        type: 'warning',
        relatedId: 2,
        relatedType: 'emergency'
      },
      {
        userId: 4,
        title: 'Complaint Acknowledged',
        message: 'Your complaint about poor lighting has been received and is under review by facilities management.',
        type: 'info',
        relatedId: 2,
        relatedType: 'complaint'
      }
    ];

    for (const notification of notifications) {
      await Database.query(`
        INSERT IGNORE INTO notifications 
        (userId, title, message, type, relatedId, relatedType)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        notification.userId,
        notification.title,
        notification.message,
        notification.type,
        notification.relatedId,
        notification.relatedType
      ]);
    }    // Create emergency contacts
    const emergencyContacts = [
      {
        name: 'BUP Campus Security',
        phoneNumber: '+88024-9870-5700',
        email: 'security@bup.edu.bd',
        department: 'Security',
        isActive: true,
        displayOrder: 1
      },
      {
        name: 'BUP Medical Center',
        phoneNumber: '+88024-9870-5706',
        email: 'medical@bup.edu.bd',
        department: 'Health Services',
        isActive: true,
        displayOrder: 2
      },
      {
        name: 'Fire Service & Civil Defence',
        phoneNumber: '199',
        email: 'fire.dhaka@fscd.gov.bd',
        department: 'Emergency Services',
        isActive: true,
        displayOrder: 3
      },
      {
        name: 'Student Counseling',
        phoneNumber: '+88024-9870-5705',
        email: 'counseling@bup.edu.bd',
        department: 'Student Affairs',
        isActive: true,
        displayOrder: 4
      }
    ];

    for (const contact of emergencyContacts) {
      await Database.query(`
        INSERT IGNORE INTO emergency_contacts 
        (name, phoneNumber, email, department, isActive, displayOrder)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        contact.name,
        contact.phoneNumber,
        contact.email,
        contact.department,
        contact.isActive,
        contact.displayOrder
      ]);
    }    // Seed safety resources
    console.log('   📚 Seeding safety resources...');
    const safetyResources = [
      {
        title: 'BUP Campus Emergency Hotline',
        description: 'Available 24/7 for all campus emergencies',
        category: 'emergency',
        content: 'Call this number for any emergency situation on BUP campus including medical emergencies, security threats, or urgent safety concerns.',
        contactInfo: JSON.stringify({
          phone: '999',
          campusPhone: '+88024-9870-5700',
          location: 'Security Office, Administration Building'
        })
      },
      {
        title: 'Student Counseling Services',
        description: 'Confidential support for mental health and counseling',
        category: 'mental_health',
        content: 'Free, confidential counseling services available for BUP students experiencing stress, anxiety, depression, or other mental health concerns.',
        contactInfo: JSON.stringify({
          phone: '+88024-9870-5704',
          campusPhone: '+88024-9870-5705',
          online: 'https://bup.edu.bd/student-services',
          location: 'Student Affairs Office, 2nd Floor, Admin Building'
        })
      },
      {
        title: 'Campus Safety Guidelines',
        description: 'Stay safe while on BUP campus',
        category: 'safety_tips',
        content: 'Always stay alert and aware of your surroundings. Use well-lit pathways and avoid isolated areas. Travel with friends, especially during evening hours. Keep your mobile phone charged and ID card visible. Report any suspicious activities to campus security immediately.',
        contactInfo: JSON.stringify({})
      },
      {
        title: 'Medical Emergency Services',
        description: 'Campus medical facility and emergency services',
        category: 'mental_health',
        content: 'BUP Medical Center provides first aid, emergency medical care, and health services for students, faculty, and staff.',
        contactInfo: JSON.stringify({
          phone: '+88024-9870-5706',
          email: 'medical@bup.edu.bd',
          location: 'BUP Medical Center, Ground Floor',
          hours: 'Sunday-Thursday 8AM-5PM, Emergency support 24/7'
        })
      },
      {
        title: 'Women Safety Helpline Bangladesh',
        description: 'National helpline for women in distress',
        category: 'helplines',
        content: 'National helpline providing support for women facing violence, harassment, or distress situations. Available 24/7 with trained counselors.',
        contactInfo: JSON.stringify({
          phone: '10921',
          website: 'https://mowca.gov.bd',
          location: 'National Women Support Center'
        })
      }
    ];

    for (const resource of safetyResources) {
      await Database.query(
        'INSERT IGNORE INTO safety_resources (title, description, category, content, contactInfo) VALUES (?, ?, ?, ?, ?)',
        [resource.title, resource.description, resource.category, resource.content, resource.contactInfo]
      );
    }

    // Seed discussion categories
    console.log('   💬 Seeding discussion categories...');
    const discussionCategories = [
      {
        name: 'Mental Health Support',
        description: 'Share experiences and support each other through mental health challenges',
        color: '#10B981'
      },
      {
        name: 'Academic Stress',
        description: 'Discuss academic pressures, study tips, and coping strategies',
        color: '#3B82F6'
      },
      {
        name: 'Harassment & Discrimination',
        description: 'Safe space to discuss and seek support for harassment or discrimination',
        color: '#EF4444'
      },
      {
        name: 'Campus Safety',
        description: 'Share safety concerns, tips, and experiences on campus',
        color: '#F59E0B'
      },
      {
        name: 'Relationships & Social Issues',
        description: 'Discuss relationship problems, social anxiety, and interpersonal challenges',
        color: '#8B5CF6'
      },
      {
        name: 'General Support',
        description: 'Any topic where you need peer support and understanding',
        color: '#6B7280'
      }
    ];

    for (const category of discussionCategories) {
      await Database.query(
        'INSERT IGNORE INTO discussion_categories (name, description, color) VALUES (?, ?, ?)',
        [category.name, category.description, category.color]
      );
    }

    // Seed safety check-ins
    const safetyCheckins = [
      {
        userId: 2,
        expectedArrivalTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        location: 'Library Entrance',
        status: 'pending',
        sosTriggered: false,
        emergencyContactId: 1,
        notes: 'Walking from dorm to library.'
      },
      {
        userId: 3,
        expectedArrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        location: 'Parking Lot C',
        status: 'pending',
        sosTriggered: false,
        emergencyContactId: 2,
        notes: 'Late night study session.'
      }
    ];
    for (const checkin of safetyCheckins) {
      await Database.query(
        'INSERT IGNORE INTO safety_checkins (userId, expectedArrivalTime, location, status, sosTriggered, emergencyContactId, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',        [
          checkin.userId,
          checkin.expectedArrivalTime instanceof Date ? checkin.expectedArrivalTime.toISOString().slice(0, 19).replace('T', ' ') : checkin.expectedArrivalTime,
          checkin.location,
          checkin.status,
          checkin.sosTriggered,
          checkin.emergencyContactId,
          checkin.notes
        ]
      );
    }

    // Seed safety badges
    console.log('   🏷️ Seeding safety badges...');
    const safetyBadges = [
      { name: 'First Check-In', description: 'Completed your first safety check-in', icon: 'badge-checkin.png', points: 10 },
      { name: 'Safety Champion', description: 'Reported 5 hazards', icon: 'badge-champion.png', points: 50 },
      { name: 'Quiz Master', description: 'Top score in safety quiz', icon: 'badge-quiz.png', points: 30 }
    ];
    for (const badge of safetyBadges) {
      await Database.query(
        'INSERT IGNORE INTO safety_badges (name, description, icon, points) VALUES (?, ?, ?, ?)',
        [badge.name, badge.description, badge.icon, badge.points]
      );
    }

    // Seed user badges
    console.log('   🎖️ Seeding user badges...');
    await Database.query('INSERT IGNORE INTO user_badges (userId, badgeId) VALUES (?, ?)', [2, 1]);
    await Database.query('INSERT IGNORE INTO user_badges (userId, badgeId) VALUES (?, ?)', [3, 2]);

    // Seed user points
    console.log('   ⭐ Seeding user points...');
    await Database.query('INSERT IGNORE INTO user_points (userId, points) VALUES (?, ?)', [2, 10]);
    await Database.query('INSERT IGNORE INTO user_points (userId, points) VALUES (?, ?)', [3, 50]);

    // Seed user verifications
    console.log('   ✅ Seeding user verifications...');
    await Database.query('INSERT IGNORE INTO user_verifications (userId, method, status, verifiedAt) VALUES (?, ?, ?, NOW())', [2, 'student_id', 'verified']);
    await Database.query('INSERT IGNORE INTO user_verifications (userId, method, status, verifiedAt) VALUES (?, ?, ?, NOW())', [3, 'email', 'verified']);

    // Seed trusted reporters
    console.log('   🛡️ Seeding trusted reporters...');
    await Database.query('INSERT IGNORE INTO trusted_reporters (userId, credibilityScore, status, grantedAt) VALUES (?, ?, ?, NOW())', [2, 100, 'trusted']);
    await Database.query('INSERT IGNORE INTO trusted_reporters (userId, credibilityScore, status, grantedAt) VALUES (?, ?, ?, NOW())', [3, 80, 'trusted']);

    // Seed lost and found items
    console.log('   🔍 Seeding lost and found items...');
    const lostAndFoundItems = [
      {
        userId: 2,
        type: 'lost',
        title: 'Lost Samsung Galaxy S24',
        description: 'Black Samsung Galaxy S24 with a green protective case. Has BUP sticker on the back. Last seen in the central library.',
        category: 'electronics',
        location: 'Central Library, Reading Hall',
        dateReported: new Date().toISOString().split('T')[0],
        dateLostFound: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
        contactInfo: JSON.stringify({ email: 'rahman.ahmed@bup.edu.bd', phone: '+88017-1234-5678', preferredContact: 'email' }),
        status: 'active',
        isAnonymous: false
      },
      {
        userId: 3,
        type: 'found',
        title: 'Found Red Backpack',
        description: 'Red backpack found in the main cafeteria. Contains engineering textbooks and a calculator. No ID found inside.',
        category: 'accessories',
        location: 'Main Cafeteria, Ground Floor',
        dateReported: new Date().toISOString().split('T')[0],
        dateLostFound: new Date().toISOString().split('T')[0], // Today
        contactInfo: JSON.stringify({ email: 'imran.hossain@bup.edu.bd', preferredContact: 'email' }),
        status: 'active',
        isAnonymous: false
      },
      {
        userId: 4,
        type: 'lost',
        title: 'Lost Set of Keys',
        description: 'Set of keys with a blue keychain with BUP logo. Includes hostel room key and locker key. Urgent!',
        category: 'keys',
        location: 'Sports Complex Parking Area',
        dateReported: new Date().toISOString().split('T')[0],
        dateLostFound: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
        contactInfo: JSON.stringify({ email: 'tasneem.rahman@bup.edu.bd', phone: '+88018-2468-1357', preferredContact: 'phone' }),
        status: 'active',
        isAnonymous: false
      },
      {
        userId: 1,
        type: 'found',
        title: 'Found BUP Student ID Card',
        description: 'BUP student ID card found in the administration building corridor. Keeping it safe at security office.',
        category: 'documents',
        location: 'Administration Building, 1st Floor',
        dateReported: new Date().toISOString().split('T')[0],
        dateLostFound: new Date().toISOString().split('T')[0], // Today
        contactInfo: JSON.stringify({ email: 'admin@bup.edu.bd', phone: '+88024-9870-5700', preferredContact: 'email' }),
        status: 'active',
        isAnonymous: false
      }
    ];

    for (const item of lostAndFoundItems) {
      await Database.query(
        `INSERT IGNORE INTO lost_and_found 
         (userId, type, title, description, category, location, dateReported, dateLostFound, contactInfo, status, isAnonymous) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.userId,
          item.type,
          item.title,
          item.description,
          item.category,
          item.location,
          item.dateReported,
          item.dateLostFound,
          item.contactInfo,
          item.status,
          item.isAnonymous
        ]
      );
    }

    console.log('✅ Database seeded successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

export const clearData = async () => {
  try {
    console.log('🧹 Clearing all data...');
    
    const tables = [
      'lost_and_found',
      'trusted_reporters',
      'user_verifications',
      'user_points',
      'user_badges',
      'safety_badges',
      'safety_checkins',
      'discussion_reports',
      'discussion_votes',
      'discussion_comments',
      'discussion_posts',
      'discussion_categories',
      'safety_resources',
      'notifications',
      'emergency_contacts',
      'complaints',
      'emergency_reports',
      'users'
    ];

    for (const table of tables) {
      await Database.query(`DELETE FROM ${table}`);
      await Database.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }

    console.log('✅ All data cleared successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
};
