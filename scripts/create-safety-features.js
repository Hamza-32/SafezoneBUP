// Create database tables for Safety Resources and Discussion Board
import { Database } from '../lib/database.js';

async function createSafetyFeaturesTables() {
  try {
    console.log('Creating safety features tables...');

    // Safety Resources table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS safety_resources (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category ENUM('emergency', 'mental_health', 'safety_tips', 'helplines', 'campus_resources') NOT NULL,
        content TEXT NOT NULL,
        contactInfo JSON,
        isActive BOOLEAN DEFAULT TRUE,
        priority INT DEFAULT 0,
        createdBy INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_category (category),
        INDEX idx_active (isActive)
      )
    `);

    // Discussion Board Categories
    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        isActive BOOLEAN DEFAULT TRUE,
        requiresModeration BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Discussion Posts
    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        categoryId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        authorId INT,
        isAnonymous BOOLEAN DEFAULT TRUE,
        status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending',
        moderatedBy INT,
        moderatedAt TIMESTAMP NULL,
        moderationNote TEXT,
        upvotes INT DEFAULT 0,
        downvotes INT DEFAULT 0,
        reportCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (categoryId) REFERENCES discussion_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (moderatedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_category (categoryId),
        INDEX idx_status (status),
        INDEX idx_created (createdAt)
      )
    `);

    // Discussion Comments
    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        postId INT NOT NULL,
        parentId INT NULL,
        content TEXT NOT NULL,
        authorId INT,
        isAnonymous BOOLEAN DEFAULT TRUE,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        moderatedBy INT,
        moderatedAt TIMESTAMP NULL,
        upvotes INT DEFAULT 0,
        downvotes INT DEFAULT 0,
        reportCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (postId) REFERENCES discussion_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES discussion_comments(id) ON DELETE CASCADE,
        FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (moderatedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_post (postId),
        INDEX idx_parent (parentId),
        INDEX idx_status (status)
      )
    `);

    // Post/Comment Votes
    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        targetType ENUM('post', 'comment') NOT NULL,
        targetId INT NOT NULL,
        voteType ENUM('upvote', 'downvote') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_vote (userId, targetType, targetId)
      )
    `);

    // Post/Comment Reports
    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reporterId INT NOT NULL,
        targetType ENUM('post', 'comment') NOT NULL,
        targetId INT NOT NULL,
        reason ENUM('spam', 'harassment', 'inappropriate', 'misinformation', 'other') NOT NULL,
        description TEXT,
        status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
        reviewedBy INT,
        reviewedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_target (targetType, targetId)
      )
    `);

    console.log('✅ Safety features tables created successfully!');

    // Insert default safety resources
    console.log('Inserting default safety resources...');
    
    const defaultResources = [
      {
        title: 'Campus Emergency Hotline',
        description: 'Available 24/7 for all campus emergencies',
        category: 'emergency',
        content: 'Call this number for any emergency situation on campus including medical emergencies, security threats, or urgent safety concerns.',
        contactInfo: JSON.stringify({
          phone: '911',
          campusPhone: '(555) 123-SAFE',
          location: 'Security Office, Main Building'
        })
      },
      {
        title: 'Mental Health Crisis Line',
        description: 'Confidential support for mental health emergencies',
        category: 'mental_health',
        content: 'Free, confidential support available 24/7 for students experiencing mental health crises, suicidal thoughts, or emotional distress.',
        contactInfo: JSON.stringify({
          phone: '988',
          campusPhone: '(555) 123-HELP',
          online: 'https://campus-counseling.edu',
          location: 'Student Wellness Center, 2nd Floor'
        })
      },
      {
        title: 'Walking Safety Tips',
        description: 'Stay safe while walking on campus',
        category: 'safety_tips',
        content: 'Always stay alert and aware of your surroundings. Walk in well-lit areas and avoid shortcuts through isolated areas. Travel with friends when possible, especially at night. Keep your phone charged and easily accessible. Trust your instincts - if something feels wrong, seek help immediately.',
        contactInfo: JSON.stringify({})
      },
      {
        title: 'Campus Counseling Services',
        description: 'Professional counseling and mental health support',
        category: 'mental_health',
        content: 'Free counseling services available to all students. Individual and group therapy sessions, crisis intervention, and mental health resources.',
        contactInfo: JSON.stringify({
          phone: '(555) 123-MIND',
          email: 'counseling@campus.edu',
          location: 'Student Wellness Center',
          hours: 'Mon-Fri 8AM-6PM, Emergency support 24/7'
        })
      },
      {
        title: 'Sexual Assault Resources',
        description: 'Confidential support and resources',
        category: 'helplines',
        content: 'Confidential support for survivors of sexual assault. Provides crisis intervention, counseling, advocacy, and support services.',
        contactInfo: JSON.stringify({
          phone: '1-800-656-HOPE',
          campusPhone: '(555) 123-SAFE',
          website: 'https://www.rainn.org',
          location: 'Confidential location - call for details'
        })
      }
    ];

    for (const resource of defaultResources) {
      await Database.query(
        'INSERT INTO safety_resources (title, description, category, content, contactInfo) VALUES (?, ?, ?, ?, ?)',
        [resource.title, resource.description, resource.category, resource.content, resource.contactInfo]
      );
    }

    // Insert default discussion categories
    console.log('Inserting default discussion categories...');
    
    const defaultCategories = [
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

    for (const category of defaultCategories) {
      await Database.query(
        'INSERT INTO discussion_categories (name, description, color) VALUES (?, ?, ?)',
        [category.name, category.description, category.color]
      );
    }

    console.log('✅ Default data inserted successfully!');

  } catch (error) {
    console.error('Error creating safety features tables:', error);
    throw error;
  }
}

createSafetyFeaturesTables().catch(console.error);
