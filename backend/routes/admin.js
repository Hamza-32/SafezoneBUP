const { Hono } = require('hono');
const bcrypt = require('bcryptjs');
const { Database } = require('../database/connection');
const { 
  authMiddleware, 
  adminMiddleware,
  logAction, 
  validateRequiredFields,
  sanitizeInput 
} = require('../middleware/auth');

const admin = new Hono();

// Get admin dashboard data
admin.get('/dashboard', authMiddleware, adminMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // Get overall statistics
    const [totalUsers] = await Database.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    const [totalAdmins] = await Database.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    const [totalEmergencyReports] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports');
    const [totalComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints');
    
    // Get pending items
    const [pendingEmergencies] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports WHERE status = "pending"');
    const [pendingComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints WHERE status = "pending"');
    const [criticalEmergencies] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports WHERE priority = "critical" AND status != "resolved"');

    // Get recent activity (last 24 hours)
    const recentEmergencies = await Database.query(
      `SELECT COUNT(*) as count FROM emergency_reports 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    const recentComplaints = await Database.query(
      `SELECT COUNT(*) as count FROM complaints 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    // Get recent reports for quick access
    const latestEmergencies = await Database.query(
      `SELECT 
        er.id, er.reference_id, er.emergency_type, er.location, 
        er.status, er.priority, er.created_at,
        u.name as reporter_name, u.student_id
       FROM emergency_reports er
       LEFT JOIN users u ON er.user_id = u.id
       ORDER BY er.created_at DESC
       LIMIT 5`
    );

    const latestComplaints = await Database.query(
      `SELECT 
        c.id, c.reference_id, c.title, c.category, 
        c.status, c.priority, c.created_at,
        u.name as reporter_name, u.student_id
       FROM complaints c
       LEFT JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC
       LIMIT 5`
    );

    // Get monthly trends (last 6 months)
    const monthlyTrends = await Database.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(CASE WHEN 'emergency_reports' THEN 1 END) as emergencies,
        COUNT(CASE WHEN 'complaints' THEN 1 END) as complaints
      FROM (
        SELECT created_at, 'emergency_reports' as type FROM emergency_reports
        UNION ALL
        SELECT created_at, 'complaints' as type FROM complaints
      ) combined
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `);

    // Get verification requests
    const [pendingVerifications] = await Database.query(
      'SELECT COUNT(*) as count FROM users WHERE verification_documents IS NOT NULL AND is_verified = FALSE'
    );

    return c.json({
      statistics: {
        users: {
          total: totalUsers.count,
          admins: totalAdmins.count,
          pendingVerifications: pendingVerifications.count
        },
        reports: {
          emergencies: {
            total: totalEmergencyReports.count,
            pending: pendingEmergencies.count,
            critical: criticalEmergencies.count,
            recent: recentEmergencies[0].count
          },
          complaints: {
            total: totalComplaints.count,
            pending: pendingComplaints.count,
            recent: recentComplaints[0].count
          }
        }
      },
      recentReports: {
        emergencies: latestEmergencies,
        complaints: latestComplaints
      },
      monthlyTrends
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    return c.json({ error: 'Failed to get admin dashboard data' }, 500);
  }
});

// Get all users
admin.get('/users', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { role, verified, page = 1, limit = 20, search } = c.req.query() || {};

    let query = `
      SELECT 
        id, name, email, role, student_id, phone, department, year,
        is_verified, created_at, updated_at,
        CASE WHEN verification_documents IS NOT NULL THEN TRUE ELSE FALSE END as has_verification_request
      FROM users
    `;

    const conditions = [];
    const params = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (verified !== undefined) {
      conditions.push('is_verified = ?');
      params.push(verified === 'true');
    }

    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ? OR student_id LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const users = await Database.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const [{ total }] = await Database.query(countQuery, params.slice(0, -2));

    return c.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// Get user details
admin.get('/users/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const userId = c.req.param('id');

    const [user] = await Database.query(
      `SELECT 
        id, name, email, role, student_id, phone, department, year,
        is_verified, verification_documents, profile_image, created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user's reports
    const emergencyReports = await Database.query(
      'SELECT id, reference_id, emergency_type, status, priority, created_at FROM emergency_reports WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const complaints = await Database.query(
      'SELECT id, reference_id, title, category, status, priority, created_at FROM complaints WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // Get user's recent activity
    const recentActivity = await Database.query(
      'SELECT action, resource_type, created_at FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    return c.json({
      user: {
        ...user,
        verification_documents: user.verification_documents ? JSON.parse(user.verification_documents) : null
      },
      reports: {
        emergencies: emergencyReports,
        complaints: complaints
      },
      recentActivity
    });

  } catch (error) {
    console.error('Get user details error:', error);
    return c.json({ error: 'Failed to get user details' }, 500);
  }
});

// Update user verification status
admin.put('/users/:id/verify', authMiddleware, adminMiddleware, async (c) => {
  try {
    const adminUser = c.get('user');
    const userId = c.req.param('id');
    const body = c.get('body') || await c.req.json();
    const { verified, notes } = sanitizeInput(body);

    if (typeof verified !== 'boolean') {
      return c.json({ error: 'Verified status must be boolean' }, 400);
    }

    // Update user verification status
    await Database.query(
      'UPDATE users SET is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [verified, userId]
    );

    // Get user info for notification
    const [user] = await Database.query(
      'SELECT name, email FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Create notification for user
    const message = verified 
      ? 'Your account has been verified successfully!' 
      : `Your verification request has been declined. ${notes ? `Reason: ${notes}` : ''}`;

    await Database.query(
      `INSERT INTO notifications (user_id, title, message, type) 
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        verified ? 'Account Verified' : 'Verification Declined',
        message,
        'system'
      ]
    );

    // Log action
    await logAction(adminUser.id, verified ? 'VERIFY_USER' : 'DECLINE_VERIFICATION', 'user', userId, { 
      verified, 
      notes 
    }, c.req);

    return c.json({
      message: `User ${verified ? 'verified' : 'verification declined'} successfully`
    });

  } catch (error) {
    console.error('Update user verification error:', error);
    return c.json({ error: 'Failed to update user verification' }, 500);
  }
});

// Create admin user
admin.post('/users/admin', authMiddleware, adminMiddleware, async (c) => {
  try {
    const adminUser = c.get('user');
    const body = c.get('body') || await c.req.json();
    const { name, email, password, phone, department } = sanitizeInput(body);

    // Validate required fields
    const requiredFields = ['name', 'email', 'password'];
    const missing = validateRequiredFields({ name, email, password }, requiredFields);
    
    if (missing.length > 0) {
      return c.json({ 
        error: 'Missing required fields', 
        missing: missing 
      }, 400);
    }

    // Check if email already exists
    const existingUser = await Database.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return c.json({ error: 'User with this email already exists' }, 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await Database.query(
      `INSERT INTO users (name, email, password, role, phone, department, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, 'admin', phone || null, department || null, true]
    );

    const newAdminId = result.insertId;

    // Log action
    await logAction(adminUser.id, 'CREATE_ADMIN', 'user', newAdminId, { 
      newAdminEmail: email 
    }, c.req);

    return c.json({
      message: 'Admin user created successfully',
      userId: newAdminId
    }, 201);

  } catch (error) {
    console.error('Create admin user error:', error);
    return c.json({ error: 'Failed to create admin user' }, 500);
  }
});

// Get system settings
admin.get('/settings', authMiddleware, adminMiddleware, async (c) => {
  try {
    const settings = await Database.query(
      'SELECT setting_key, setting_value, description, updated_at FROM system_settings ORDER BY setting_key'
    );

    return c.json({
      settings
    });

  } catch (error) {
    console.error('Get system settings error:', error);
    return c.json({ error: 'Failed to get system settings' }, 500);
  }
});

// Update system setting
admin.put('/settings/:key', authMiddleware, adminMiddleware, async (c) => {
  try {
    const adminUser = c.get('user');
    const settingKey = c.req.param('key');
    const body = c.get('body') || await c.req.json();
    const { value } = sanitizeInput(body);

    if (value === undefined) {
      return c.json({ error: 'Setting value is required' }, 400);
    }

    // Update or insert setting
    await Database.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       setting_value = VALUES(setting_value), 
       updated_by = VALUES(updated_by), 
       updated_at = CURRENT_TIMESTAMP`,
      [settingKey, value, adminUser.id]
    );

    // Log action
    await logAction(adminUser.id, 'UPDATE_SYSTEM_SETTING', 'system_setting', null, { 
      settingKey, 
      newValue: value 
    }, c.req);

    return c.json({
      message: 'System setting updated successfully'
    });

  } catch (error) {
    console.error('Update system setting error:', error);
    return c.json({ error: 'Failed to update system setting' }, 500);
  }
});

// Get audit logs
admin.get('/audit-logs', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { action, user_id, page = 1, limit = 50 } = c.req.query() || {};

    let query = `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;

    const conditions = [];
    const params = [];

    if (action) {
      conditions.push('al.action = ?');
      params.push(action);
    }

    if (user_id) {
      conditions.push('al.user_id = ?');
      params.push(user_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY al.created_at DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const logs = await Database.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs al';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const [{ total }] = await Database.query(countQuery, params.slice(0, -2));

    return c.json({
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    return c.json({ error: 'Failed to get audit logs' }, 500);
  }
});

// Get emergency contacts management
admin.get('/emergency-contacts', authMiddleware, adminMiddleware, async (c) => {
  try {
    const contacts = await Database.query(
      'SELECT * FROM emergency_contacts ORDER BY is_primary DESC, name ASC'
    );

    return c.json({
      contacts
    });

  } catch (error) {
    console.error('Get emergency contacts error:', error);
    return c.json({ error: 'Failed to get emergency contacts' }, 500);
  }
});

// Update emergency contact
admin.put('/emergency-contacts/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const adminUser = c.get('user');
    const contactId = c.req.param('id');
    const body = c.get('body') || await c.req.json();
    const { name, phone, email, department, is_primary, is_active } = sanitizeInput(body);

    // Build update query
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (phone) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (department) {
      updates.push('department = ?');
      params.push(department);
    }
    if (typeof is_primary === 'boolean') {
      updates.push('is_primary = ?');
      params.push(is_primary);
    }
    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(contactId);

    await Database.query(
      `UPDATE emergency_contacts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log action
    await logAction(adminUser.id, 'UPDATE_EMERGENCY_CONTACT', 'emergency_contact', contactId, { 
      updates: Object.keys(body) 
    }, c.req);

    return c.json({
      message: 'Emergency contact updated successfully'
    });

  } catch (error) {
    console.error('Update emergency contact error:', error);
    return c.json({ error: 'Failed to update emergency contact' }, 500);
  }
});

module.exports = admin;
