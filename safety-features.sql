-- Safety Features Database Tables

-- Safety Resources table
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
);

-- Discussion Board Categories
CREATE TABLE IF NOT EXISTS discussion_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  isActive BOOLEAN DEFAULT TRUE,
  requiresModeration BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discussion Posts
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
);

-- Discussion Comments
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
);

-- Post/Comment Votes
CREATE TABLE IF NOT EXISTS discussion_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  targetType ENUM('post', 'comment') NOT NULL,
  targetId INT NOT NULL,
  voteType ENUM('upvote', 'downvote') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_vote (userId, targetType, targetId)
);

-- Post/Comment Reports
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
);

-- Insert default safety resources
INSERT IGNORE INTO safety_resources (title, description, category, content, contactInfo) VALUES
('Campus Emergency Hotline', 'Available 24/7 for all campus emergencies', 'emergency', 'Call this number for any emergency situation on campus including medical emergencies, security threats, or urgent safety concerns.', '{"phone": "911", "campusPhone": "(555) 123-SAFE", "location": "Security Office, Main Building"}'),
('Mental Health Crisis Line', 'Confidential support for mental health emergencies', 'mental_health', 'Free, confidential support available 24/7 for students experiencing mental health crises, suicidal thoughts, or emotional distress.', '{"phone": "988", "campusPhone": "(555) 123-HELP", "online": "https://campus-counseling.edu", "location": "Student Wellness Center, 2nd Floor"}'),
('Walking Safety Tips', 'Stay safe while walking on campus', 'safety_tips', 'Always stay alert and aware of your surroundings. Walk in well-lit areas and avoid shortcuts through isolated areas. Travel with friends when possible, especially at night. Keep your phone charged and easily accessible. Trust your instincts - if something feels wrong, seek help immediately.', '{}'),
('Campus Counseling Services', 'Professional counseling and mental health support', 'mental_health', 'Free counseling services available to all students. Individual and group therapy sessions, crisis intervention, and mental health resources.', '{"phone": "(555) 123-MIND", "email": "counseling@campus.edu", "location": "Student Wellness Center", "hours": "Mon-Fri 8AM-6PM, Emergency support 24/7"}'),
('Sexual Assault Resources', 'Confidential support and resources', 'helplines', 'Confidential support for survivors of sexual assault. Provides crisis intervention, counseling, advocacy, and support services.', '{"phone": "1-800-656-HOPE", "campusPhone": "(555) 123-SAFE", "website": "https://www.rainn.org", "location": "Confidential location - call for details"}');

-- Insert default discussion categories
INSERT IGNORE INTO discussion_categories (name, description, color) VALUES
('Mental Health Support', 'Share experiences and support each other through mental health challenges', '#10B981'),
('Academic Stress', 'Discuss academic pressures, study tips, and coping strategies', '#3B82F6'),
('Harassment & Discrimination', 'Safe space to discuss and seek support for harassment or discrimination', '#EF4444'),
('Campus Safety', 'Share safety concerns, tips, and experiences on campus', '#F59E0B'),
('Relationships & Social Issues', 'Discuss relationship problems, social anxiety, and interpersonal challenges', '#8B5CF6'),
('General Support', 'Any topic where you need peer support and understanding', '#6B7280');
