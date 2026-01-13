const { Database } = require('./connection');
const dotenv = require('dotenv');

dotenv.config();

const createTables = async () => {
  try {
    console.log('🔧 Setting up SafeZone database...');

    // Create users table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
        student_id VARCHAR(50) UNIQUE,
        phone VARCHAR(20),
        department VARCHAR(100),
        year INT,
        profile_image VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_documents JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_student_id (student_id),
        INDEX idx_role (role)
      )
    `);

    // Create emergency_reports table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS emergency_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_id VARCHAR(20) UNIQUE NOT NULL,
        user_id INT,
        emergency_type VARCHAR(100) NOT NULL,
        location VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        contact_number VARCHAR(20),
        is_anonymous BOOLEAN DEFAULT FALSE,
        is_for_someone_else BOOLEAN DEFAULT FALSE,
        reporter_name VARCHAR(255),
        status ENUM('pending', 'in_progress', 'resolved', 'closed') DEFAULT 'pending',
        priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'high',
        assigned_to INT,
        resolution_notes TEXT,
        coordinates JSON,
        attachments JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_reference_id (reference_id),
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create complaints table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_id VARCHAR(20) UNIQUE NOT NULL,
        user_id INT,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(500),
        is_anonymous BOOLEAN DEFAULT FALSE,
        contact_info VARCHAR(255),
        status ENUM('pending', 'under_review', 'resolved', 'closed') DEFAULT 'pending',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        assigned_to INT,
        resolution_notes TEXT,
        attachments JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_reference_id (reference_id),
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create notifications table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('emergency', 'complaint', 'system', 'announcement') NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_id INT,
        related_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_type (type)
      )
    `);

    // Create audit_logs table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INT,
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_resource_type (resource_type),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create system_settings table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_setting_key (setting_key)
      )
    `);

    // Create emergency_contacts table
    await Database.query(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        department VARCHAR(100),
        is_primary BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_primary (is_primary),
        INDEX idx_is_active (is_active)
      )
    `);

    // Create report_updates table for tracking status changes
    await Database.query(`
      CREATE TABLE IF NOT EXISTS report_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        report_type ENUM('emergency', 'complaint') NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        updated_by INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_report_id_type (report_id, report_type),
        INDEX idx_created_at (created_at)
      )
    `);

    console.log('✅ All tables created successfully!');
    
    // Insert default system settings
    await Database.query(`
      INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
      ('emergency_phone', '911', 'Primary emergency contact number'),
      ('campus_security_phone', '555-0123', 'Campus security contact number'),
      ('admin_email', 'admin@safezone.edu', 'Administrator email address'),
      ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
      ('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)')
    `);

    // Insert default emergency contacts
    await Database.query(`
      INSERT IGNORE INTO emergency_contacts (name, phone, email, department, is_primary) VALUES
      ('Campus Security', '555-0123', 'security@safezone.edu', 'Security', true),
      ('Medical Emergency', '911', 'medical@safezone.edu', 'Health Services', true),
      ('Fire Department', '911', 'fire@safezone.edu', 'Fire Safety', true),
      ('Student Counseling', '555-0456', 'counseling@safezone.edu', 'Student Services', false),
      ('Maintenance', '555-0789', 'maintenance@safezone.edu', 'Facilities', false)
    `);

    console.log('✅ Default system data inserted!');
    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  }
};

// Run setup if called directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables };
