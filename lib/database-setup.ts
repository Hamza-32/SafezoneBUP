import { Database } from './database';

/**
 * PostgreSQL schema.
 *
 * Two conventions differ from the MySQL original this was converted from:
 *
 * Enumerations are TEXT with a CHECK constraint rather than a native enum
 * type. Both enforce the same values, but a CHECK constraint can be widened
 * by an ordinary ALTER in a migration, whereas changing a native enum needs
 * ALTER TYPE and is far more awkward. Two of the existing migrations widen
 * these value lists, so the constraint form is the practical choice.
 *
 * Column names are written unquoted, which means PostgreSQL stores them
 * lower-cased. Queries are unaffected because they fold identically, and the
 * data layer restores the casing on returned rows. See
 * lib/database-columns.ts for why.
 */

/**
 * MySQL updated a column automatically with ON UPDATE CURRENT_TIMESTAMP.
 * PostgreSQL has no equivalent, so a trigger does the same job. Most write
 * paths set updatedAt explicitly anyway; this catches the ones that do not.
 */
const UPDATED_AT_FUNCTION = `
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

/** Tables carrying an updatedAt column that the trigger should maintain. */
const TABLES_WITH_UPDATED_AT = [
  'users',
  'emergency_reports',
  'complaints',
  'system_settings',
  'emergency_contacts',
  'safety_resources',
  'discussion_posts',
  'discussion_comments',
  'safety_checkins',
  'lost_and_found',
];

async function attachUpdatedAtTriggers(): Promise<void> {
  await Database.query(UPDATED_AT_FUNCTION);

  for (const table of TABLES_WITH_UPDATED_AT) {
    // DROP then CREATE, because CREATE TRIGGER has no IF NOT EXISTS before
    // PostgreSQL 14 and this has to be safe to re-run.
    await Database.query(`DROP TRIGGER IF EXISTS ${table}_set_updated_at ON ${table}`);
    await Database.query(`
      CREATE TRIGGER ${table}_set_updated_at
      BEFORE UPDATE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);
  }
}

export const createTables = async () => {
  try {
    console.log('🔧 Setting up SafezoneBUP database...');

    await Database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        studentId VARCHAR(50) UNIQUE,
        phoneNumber VARCHAR(20),
        role TEXT NOT NULL DEFAULT 'student'
          CHECK (role IN ('student', 'admin', 'security')),
        isVerified BOOLEAN DEFAULT FALSE,
        profileImage VARCHAR(255),
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS emergency_reports (
        id SERIAL PRIMARY KEY,
        referenceId VARCHAR(64) UNIQUE,
        -- Nullable: an emergency may be reported by someone who is not
        -- signed in, and that report still has to be stored.
        userId INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL
          CHECK (category IN ('medical', 'security', 'fire', 'accident', 'violence', 'other')),
        location VARCHAR(255) NOT NULL,
        latitude NUMERIC(10, 8),
        longitude NUMERIC(11, 8),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'investigating', 'resolved', 'closed')),
        priority TEXT NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        isAnonymous BOOLEAN DEFAULT FALSE,
        attachments JSONB,
        adminNotes TEXT,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        referenceId VARCHAR(64) UNIQUE,
        -- Nullable for the same reason as emergency_reports.userId.
        userId INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL
          CHECK (category IN ('facility', 'service', 'academic', 'harassment', 'bullying',
                              'discrimination', 'misconduct', 'property', 'noise', 'other')),
        location VARCHAR(255),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'investigating', 'resolved', 'closed')),
        priority TEXT NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('low', 'medium', 'high')),
        isAnonymous BOOLEAN DEFAULT FALSE,
        attachments JSONB,
        adminResponse TEXT,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info'
          CHECK (type IN ('info', 'warning', 'success', 'error')),
        isRead BOOLEAN DEFAULT FALSE,
        relatedId INTEGER,
        relatedType TEXT
          CHECK (relatedType IS NULL OR relatedType IN ('emergency', 'complaint', 'system')),
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        userId INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        tableName VARCHAR(100),
        recordId INTEGER,
        oldValues JSONB,
        newValues JSONB,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        settingKey VARCHAR(255) UNIQUE NOT NULL,
        settingValue TEXT,
        description TEXT,
        category VARCHAR(100),
        isPublic BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phoneNumber VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        department VARCHAR(100),
        isActive BOOLEAN DEFAULT TRUE,
        displayOrder INTEGER DEFAULT 0,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS safety_resources (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category TEXT NOT NULL
          CHECK (category IN ('emergency', 'mental_health', 'safety_tips',
                              'helplines', 'campus_resources')),
        content TEXT NOT NULL,
        contactInfo JSONB,
        isActive BOOLEAN DEFAULT TRUE,
        priority INTEGER DEFAULT 0,
        createdBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        isActive BOOLEAN DEFAULT TRUE,
        requiresModeration BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_posts (
        id SERIAL PRIMARY KEY,
        categoryId INTEGER NOT NULL REFERENCES discussion_categories(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        authorId INTEGER REFERENCES users(id) ON DELETE SET NULL,
        isAnonymous BOOLEAN DEFAULT TRUE,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
        moderatedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
        moderatedAt TIMESTAMPTZ,
        moderationNote TEXT,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        reportCount INTEGER DEFAULT 0,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_comments (
        id SERIAL PRIMARY KEY,
        postId INTEGER NOT NULL REFERENCES discussion_posts(id) ON DELETE CASCADE,
        parentId INTEGER REFERENCES discussion_comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        authorId INTEGER REFERENCES users(id) ON DELETE SET NULL,
        isAnonymous BOOLEAN DEFAULT TRUE,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        moderatedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
        moderatedAt TIMESTAMPTZ,
        moderationNote TEXT,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        reportCount INTEGER DEFAULT 0,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_votes (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        targetType TEXT NOT NULL CHECK (targetType IN ('post', 'comment')),
        targetId INTEGER NOT NULL,
        voteType TEXT NOT NULL CHECK (voteType IN ('upvote', 'downvote')),
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_vote UNIQUE (userId, targetType, targetId)
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS discussion_reports (
        id SERIAL PRIMARY KEY,
        reporterId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        targetType TEXT NOT NULL CHECK (targetType IN ('post', 'comment')),
        targetId INTEGER NOT NULL,
        reason TEXT NOT NULL
          CHECK (reason IN ('spam', 'harassment', 'inappropriate',
                            'misinformation', 'other')),
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'reviewed', 'resolved')),
        reviewedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewedAt TIMESTAMPTZ,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS safety_checkins (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        checkinTime TIMESTAMPTZ DEFAULT NOW(),
        expectedArrivalTime TIMESTAMPTZ,
        location VARCHAR(255),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'arrived', 'missed', 'alerted')),
        sosTriggered BOOLEAN DEFAULT FALSE,
        emergencyContactId INTEGER REFERENCES emergency_contacts(id) ON DELETE SET NULL,
        notes TEXT,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS safety_badges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(255),
        points INTEGER DEFAULT 0,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badgeId INTEGER NOT NULL REFERENCES safety_badges(id) ON DELETE CASCADE,
        awardedAt TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_badge UNIQUE (userId, badgeId)
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS user_points (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points INTEGER DEFAULT 0,
        lastUpdated TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_points UNIQUE (userId)
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS user_verifications (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method TEXT NOT NULL
          CHECK (method IN ('student_id', 'email', '2fa', 'admin_manual')),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'verified', 'rejected')),
        submittedAt TIMESTAMPTZ DEFAULT NOW(),
        verifiedAt TIMESTAMPTZ,
        rejectedAt TIMESTAMPTZ,
        rejectionReason TEXT,
        documentUrl VARCHAR(255)
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS trusted_reporters (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credibilityScore INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'trusted', 'revoked')),
        grantedAt TIMESTAMPTZ,
        revokedAt TIMESTAMPTZ,
        CONSTRAINT unique_trusted_reporter UNIQUE (userId)
      )
    `);

    await Database.query(`
      CREATE TABLE IF NOT EXISTS lost_and_found (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL
          CHECK (category IN ('electronics', 'clothing', 'books', 'accessories',
                              'documents', 'keys', 'other')),
        location VARCHAR(255),
        dateReported DATE NOT NULL,
        dateLostFound DATE,
        imageUrl VARCHAR(500),
        contactInfo JSONB,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'resolved', 'expired')),
        isAnonymous BOOLEAN DEFAULT FALSE,
        resolvedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
        resolvedAt TIMESTAMPTZ,
        expiresAt TIMESTAMPTZ,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('   tables created, adding indexes...');

    // Indexes are separate statements in PostgreSQL rather than clauses
    // inside CREATE TABLE.
    const indexes: Array<[string, string, string]> = [
      ['idx_reports_status', 'emergency_reports', 'status'],
      ['idx_reports_category', 'emergency_reports', 'category'],
      ['idx_reports_created', 'emergency_reports', 'createdAt'],
      ['idx_reports_user', 'emergency_reports', 'userId'],
      ['idx_complaints_status', 'complaints', 'status'],
      ['idx_complaints_user', 'complaints', 'userId'],
      ['idx_notifications_user', 'notifications', 'userId'],
      ['idx_notifications_read', 'notifications', 'isRead'],
      ['idx_audit_user', 'audit_logs', 'userId'],
      ['idx_audit_created', 'audit_logs', 'createdAt'],
      ['idx_resources_category', 'safety_resources', 'category'],
      ['idx_resources_active', 'safety_resources', 'isActive'],
      ['idx_posts_category', 'discussion_posts', 'categoryId'],
      ['idx_posts_status', 'discussion_posts', 'status'],
      ['idx_posts_created', 'discussion_posts', 'createdAt'],
      ['idx_comments_post', 'discussion_comments', 'postId'],
      ['idx_comments_parent', 'discussion_comments', 'parentId'],
      ['idx_comments_status', 'discussion_comments', 'status'],
      ['idx_reports_disc_status', 'discussion_reports', 'status'],
      ['idx_checkins_user', 'safety_checkins', 'userId'],
      ['idx_checkins_status', 'safety_checkins', 'status'],
      ['idx_lf_type', 'lost_and_found', 'type'],
      ['idx_lf_category', 'lost_and_found', 'category'],
      ['idx_lf_status', 'lost_and_found', 'status'],
      ['idx_lf_date_reported', 'lost_and_found', 'dateReported'],
    ];

    for (const [name, table, column] of indexes) {
      await Database.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${column})`);
    }

    await Database.query(
      'CREATE INDEX IF NOT EXISTS idx_reports_disc_target ON discussion_reports (targetType, targetId)'
    );

    console.log('   adding updatedAt triggers...');
    await attachUpdatedAtTriggers();

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
      'schema_migrations',
      'users',
    ];

    for (const table of tables) {
      // CASCADE so a dependency does not block the drop regardless of order.
      await Database.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    await Database.query('DROP FUNCTION IF EXISTS set_updated_at() CASCADE');

    console.log('✅ All tables dropped successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
};
