const { Hono } = require('hono');
const { Database } = require('../database/connection');
const { 
  authMiddleware, 
  logAction, 
  sanitizeInput 
} = require('../middleware/auth');

const user = new Hono();

// Get user notifications
user.get('/notifications', authMiddleware, async (c) => {
  try {
    const userData = c.get('user');
    const { page = 1, limit = 20, unread_only } = c.req.query() || {};

    let query = `
      SELECT 
        n.*,
        CASE 
          WHEN n.related_type = 'emergency_report' THEN er.reference_id
          WHEN n.related_type = 'complaint' THEN co.reference_id
          ELSE NULL
        END as related_reference_id
      FROM notifications n
      LEFT JOIN emergency_reports er ON n.related_type = 'emergency_report' AND n.related_id = er.id
      LEFT JOIN complaints co ON n.related_type = 'complaint' AND n.related_id = co.id
      WHERE n.user_id = ?
    `;

    const params = [userData.id];

    if (unread_only === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const notifications = await Database.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countParams = [userData.id];

    if (unread_only === 'true') {
      countQuery += ' AND is_read = FALSE';
    }

    const [{ total }] = await Database.query(countQuery, countParams);

    return c.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ error: 'Failed to get notifications' }, 500);
  }
});

// Mark notification as read
user.put('/notifications/:id/read', authMiddleware, async (c) => {
  try {
    const userData = c.get('user');
    const notificationId = c.req.param('id');

    // Verify notification belongs to user
    const [notification] = await Database.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userData.id]
    );

    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    // Mark as read
    await Database.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );

    return c.json({
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

// Mark all notifications as read
user.put('/notifications/read-all', authMiddleware, async (c) => {
  try {
    const userData = c.get('user');

    await Database.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userData.id]
    );

    return c.json({
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return c.json({ error: 'Failed to mark all notifications as read' }, 500);
  }
});

// Get user dashboard data
user.get('/dashboard', authMiddleware, async (c) => {
  try {
    const userData = c.get('user');

    // Get user's reports counts
    const [emergencyReports] = await Database.query(
      'SELECT COUNT(*) as count FROM emergency_reports WHERE user_id = ?',
      [userData.id]
    );

    const [complaints] = await Database.query(
      'SELECT COUNT(*) as count FROM complaints WHERE user_id = ?',
      [userData.id]
    );

    // Get unread notifications count
    const [unreadNotifications] = await Database.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userData.id]
    );

    // Get recent reports
    const recentEmergencyReports = await Database.query(
      `SELECT id, reference_id, emergency_type, status, created_at 
       FROM emergency_reports 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userData.id]
    );

    const recentComplaints = await Database.query(
      `SELECT id, reference_id, title, category, status, created_at 
       FROM complaints 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userData.id]
    );

    // Get recent notifications
    const recentNotifications = await Database.query(
      `SELECT id, title, message, type, is_read, created_at 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userData.id]
    );

    return c.json({
      user: userData,
      statistics: {
        emergencyReports: emergencyReports.count,
        complaints: complaints.count,
        unreadNotifications: unreadNotifications.count
      },
      recentReports: {
        emergencyReports: recentEmergencyReports,
        complaints: recentComplaints
      },
      recentNotifications
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    return c.json({ error: 'Failed to get dashboard data' }, 500);
  }
});

// Submit verification documents
user.post('/verification', authMiddleware, async (c) => {
  try {
    const userData = c.get('user');
    const body = c.get('body') || await c.req.json();
    const { documents, additionalInfo } = sanitizeInput(body);

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return c.json({ error: 'At least one verification document is required' }, 400);
    }

    // Update user with verification documents
    await Database.query(
      `UPDATE users 
       SET verification_documents = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [JSON.stringify({ documents, additionalInfo, submittedAt: new Date() }), userData.id]
    );

    // Create notification for admins
    const admins = await Database.query('SELECT id FROM users WHERE role = "admin"');
    
    for (const admin of admins) {
      await Database.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, related_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          admin.id,
          'New Verification Request',
          `User ${userData.name} (${userData.email}) has submitted verification documents.`,
          'system',
          userData.id,
          'verification'
        ]
      );
    }

    // Log action
    await logAction(userData.id, 'SUBMIT_VERIFICATION', 'user', userData.id, { 
      documentsCount: documents.length 
    }, c.req);

    return c.json({
      message: 'Verification documents submitted successfully'
    });

  } catch (error) {
    console.error('Submit verification error:', error);
    return c.json({ error: 'Failed to submit verification documents' }, 500);
  }
});

// Get emergency contacts
user.get('/emergency-contacts', async (c) => {
  try {
    const contacts = await Database.query(
      'SELECT name, phone, email, department, is_primary FROM emergency_contacts WHERE is_active = TRUE ORDER BY is_primary DESC, name ASC'
    );

    return c.json({
      contacts
    });

  } catch (error) {
    console.error('Get emergency contacts error:', error);
    return c.json({ error: 'Failed to get emergency contacts' }, 500);
  }
});

// Get user activity history
user.get('/activity', authMiddleware, async (c) => {
  try {
    const userData = c.get('user');
    const { page = 1, limit = 20 } = c.req.query() || {};

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const activities = await Database.query(
      `SELECT action, resource_type, resource_id, details, created_at 
       FROM audit_logs 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userData.id, parseInt(limit), offset]
    );

    // Get total count
    const [{ total }] = await Database.query(
      'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ?',
      [userData.id]
    );

    return c.json({
      activities: activities.map(activity => ({
        ...activity,
        details: activity.details ? JSON.parse(activity.details) : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    return c.json({ error: 'Failed to get user activity' }, 500);
  }
});

// Delete user account (self-deletion)
user.delete('/account', authMiddleware, async (c) => {
  try {
    const userData = c.get('user');
    const body = c.get('body') || await c.req.json();
    const { reason } = sanitizeInput(body);

    // Log the deletion action before deleting
    await logAction(userData.id, 'DELETE_ACCOUNT', 'user', userData.id, { reason }, c.req);

    // Anonymize user's reports instead of deleting them
    await Database.transaction(async (connection) => {
      // Update emergency reports to anonymous
      await connection.execute(
        'UPDATE emergency_reports SET user_id = NULL, is_anonymous = TRUE WHERE user_id = ?',
        [userData.id]
      );

      // Update complaints to anonymous
      await connection.execute(
        'UPDATE complaints SET user_id = NULL, is_anonymous = TRUE WHERE user_id = ?',
        [userData.id]
      );

      // Delete user's notifications
      await connection.execute(
        'DELETE FROM notifications WHERE user_id = ?',
        [userData.id]
      );

      // Delete user account
      await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [userData.id]
      );
    });

    return c.json({
      message: 'Account deleted successfully. Your reports have been anonymized.'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

module.exports = user;
