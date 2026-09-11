import { Database } from './database';

export const createTables = async () => {
  try {
    console.log('🔧 Setting up SafezoneBUP database...');    // Create users table
    await Database.query(`
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
    `);    // Create emergency_reports table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS emergency_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referenceId VARCHAR(64) NULL UNIQUE,
        -- Nullable: an emergency may be reported by someone who is not
        -- signed in, and that report still has to be stored.
        userId INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category ENUM('medical', 'security', 'fire', 'accident', 'violence', 'other') NOT NULL,
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
    `);    // Create complaints table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referenceId VARCHAR(64) NULL UNIQUE,
        -- Nullable for the same reason as emergency_reports.userId.
        userId INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category ENUM('facility', 'service', 'academic', 'harassment', 'bullying',
                      'discrimination', 'misconduct', 'property', 'noise', 'other') NOT NULL,
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
    `);    // Create notifications table
    await Database.query(`
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

    // Create audit_logs table
    await Database.query(`
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

    // Create system_settings table
    await Database.query(`
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

    // Create emergency_contacts table
    await Database.query(`
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

    // Create safety_resources table
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

    // Create discussion_categories table
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

    // Create discussion_posts table
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

    // Create discussion_comments table
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

    // Create discussion_votes table
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

    // Create discussion_reports table
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

    // Create safety_checkins table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS safety_checkins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        checkinTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expectedArrivalTime TIMESTAMP NULL,
        location VARCHAR(255),
        status ENUM('pending', 'arrived', 'missed', 'alerted') DEFAULT 'pending',
        sosTriggered BOOLEAN DEFAULT FALSE,
        emergencyContactId INT,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (emergencyContactId) REFERENCES emergency_contacts(id) ON DELETE SET NULL
      )
    `);

    // Create safety_badges table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS safety_badges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(255),
        points INT DEFAULT 0,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_badges table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        badgeId INT NOT NULL,
        awardedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (badgeId) REFERENCES safety_badges(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_badge (userId, badgeId)
      )
    `);

    // Create user_points table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS user_points (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        points INT DEFAULT 0,
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_points (userId)
      )
    `);

    // Create user_verifications table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS user_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        method ENUM('student_id', 'email', '2fa', 'admin_manual') NOT NULL,
        status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verifiedAt TIMESTAMP NULL,
        rejectedAt TIMESTAMP NULL,
        rejectionReason TEXT,
        documentUrl VARCHAR(255),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create trusted_reporters table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS trusted_reporters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        credibilityScore INT DEFAULT 0,
        status ENUM('pending', 'trusted', 'revoked') DEFAULT 'pending',
        grantedAt TIMESTAMP NULL,
        revokedAt TIMESTAMP NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_trusted_reporter (userId)
      )
    `);

    // Create lost_and_found table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS lost_and_found (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        type ENUM('lost', 'found') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category ENUM('electronics', 'clothing', 'books', 'accessories', 'documents', 'keys', 'other') NOT NULL,
        location VARCHAR(255),
        dateReported DATE NOT NULL,
        dateLostFound DATE,
        imageUrl VARCHAR(500),
        contactInfo JSON,
        status ENUM('active', 'resolved', 'expired') DEFAULT 'active',
        isAnonymous BOOLEAN DEFAULT FALSE,
        resolvedBy INT,
        resolvedAt TIMESTAMP NULL,
        expiresAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resolvedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_type (type),
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_location (location),
        INDEX idx_date_reported (dateReported)
      )
    `);

    console.log('✅ Database tables created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
    throw error;
  }
};

export const dropTables = async () => {
  try {
    console.log('🗑️ Dropping all tables...');
    
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
      'audit_logs',
      'system_settings',
      'notifications',
      'emergency_contacts',
      'complaints',
      'emergency_reports',
      'users'
    ];

    for (const table of tables) {
      await Database.query(`DROP TABLE IF EXISTS ${table}`);
    }

    console.log('✅ All tables dropped successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
};
