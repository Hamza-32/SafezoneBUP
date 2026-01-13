const { Hono } = require('hono');
const { Database } = require('../database/connection');
const { 
  authMiddleware, 
  optionalAuthMiddleware,
  adminMiddleware,
  logAction, 
  generateReferenceId,
  validateRequiredFields, 
  sanitizeInput 
} = require('../middleware/auth');

const emergency = new Hono();

// Create emergency report endpoint (with optional authentication)
emergency.post('/report', optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = c.get('body') || await c.req.json();
    const {
      emergencyType,
      location,
      description,
      contactNumber,
      isAnonymous,
      isForSomeoneElse,
      reporterName,
      coordinates
    } = sanitizeInput(body);

    // Validate required fields
    const requiredFields = ['emergencyType', 'location', 'description'];
    const missing = validateRequiredFields({ emergencyType, location, description }, requiredFields);
    
    if (missing.length > 0) {
      return c.json({ 
        error: 'Missing required fields', 
        missing: missing 
      }, 400);
    }

    // Generate reference ID
    const referenceId = generateReferenceId('EMG');

    // Determine priority based on emergency type
    let priority = 'high';
    const criticalTypes = ['Medical Emergency', 'Fire Emergency', 'Violence', 'Accident'];
    if (criticalTypes.some(type => emergencyType.toLowerCase().includes(type.toLowerCase()))) {
      priority = 'critical';
    }

    // Create emergency report
    const result = await Database.query(
      `INSERT INTO emergency_reports 
       (reference_id, user_id, emergency_type, location, description, contact_number, 
        is_anonymous, is_for_someone_else, reporter_name, priority, coordinates) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        referenceId,
        user?.id || null,
        emergencyType,
        location,
        description,
        contactNumber || null,
        isAnonymous || false,
        isForSomeoneElse || false,
        reporterName || (user ? user.name : null),
        priority,
        coordinates ? JSON.stringify(coordinates) : null
      ]
    );

    const reportId = result.insertId;

    // Create notification for admins
    const admins = await Database.query('SELECT id FROM users WHERE role = "admin"');
    
    for (const admin of admins) {
      await Database.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, related_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          admin.id,
          `🚨 New Emergency Report - ${emergencyType}`,
          `Emergency reported at ${location}. Priority: ${priority.toUpperCase()}. Reference: ${referenceId}`,
          'emergency',
          reportId,
          'emergency_report'
        ]
      );
    }

    // Log action
    if (user) {
      await logAction(user.id, 'CREATE_EMERGENCY_REPORT', 'emergency_report', reportId, { 
        emergencyType, 
        priority,
        isAnonymous 
      }, c.req);
    }

    return c.json({
      message: 'Emergency report submitted successfully',
      referenceId,
      priority,
      reportId
    }, 201);

  } catch (error) {
    console.error('Emergency report error:', error);
    return c.json({ error: 'Failed to submit emergency report' }, 500);
  }
});

// Get all emergency reports (admin only)
emergency.get('/reports', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { status, priority, page = 1, limit = 20 } = c.req.query() || {};
    
    let query = `
      SELECT 
        er.*,
        u.name as reporter_name,
        u.student_id,
        assigned_admin.name as assigned_admin_name
      FROM emergency_reports er
      LEFT JOIN users u ON er.user_id = u.id
      LEFT JOIN users assigned_admin ON er.assigned_to = assigned_admin.id
    `;
    
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('er.status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('er.priority = ?');
      params.push(priority);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY er.created_at DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const reports = await Database.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM emergency_reports er';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const [{ total }] = await Database.query(countQuery, params.slice(0, -2));

    return c.json({
      reports: reports.map(report => ({
        ...report,
        coordinates: report.coordinates ? JSON.parse(report.coordinates) : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get emergency reports error:', error);
    return c.json({ error: 'Failed to get emergency reports' }, 500);
  }
});

// Get user's emergency reports
emergency.get('/my-reports', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const reports = await Database.query(
      `SELECT 
        er.*,
        assigned_admin.name as assigned_admin_name
       FROM emergency_reports er
       LEFT JOIN users assigned_admin ON er.assigned_to = assigned_admin.id
       WHERE er.user_id = ?
       ORDER BY er.created_at DESC`,
      [user.id]
    );

    return c.json({
      reports: reports.map(report => ({
        ...report,
        coordinates: report.coordinates ? JSON.parse(report.coordinates) : null
      }))
    });

  } catch (error) {
    console.error('Get user emergency reports error:', error);
    return c.json({ error: 'Failed to get your emergency reports' }, 500);
  }
});

// Get emergency report by ID
emergency.get('/reports/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const reportId = c.req.param('id');

    let query = `
      SELECT 
        er.*,
        u.name as reporter_name,
        u.student_id,
        assigned_admin.name as assigned_admin_name
      FROM emergency_reports er
      LEFT JOIN users u ON er.user_id = u.id
      LEFT JOIN users assigned_admin ON er.assigned_to = assigned_admin.id
      WHERE er.id = ?
    `;

    // If not admin, only allow viewing own reports
    if (user.role !== 'admin') {
      query += ' AND er.user_id = ?';
    }

    const params = user.role === 'admin' ? [reportId] : [reportId, user.id];
    const reports = await Database.query(query, params);

    if (reports.length === 0) {
      return c.json({ error: 'Emergency report not found' }, 404);
    }

    const report = reports[0];

    // Get status update history
    const updates = await Database.query(
      `SELECT 
        ru.*,
        u.name as updated_by_name
       FROM report_updates ru
       LEFT JOIN users u ON ru.updated_by = u.id
       WHERE ru.report_id = ? AND ru.report_type = 'emergency'
       ORDER BY ru.created_at DESC`,
      [reportId]
    );

    return c.json({
      report: {
        ...report,
        coordinates: report.coordinates ? JSON.parse(report.coordinates) : null
      },
      updates
    });

  } catch (error) {
    console.error('Get emergency report error:', error);
    return c.json({ error: 'Failed to get emergency report' }, 500);
  }
});

// Update emergency report status (admin only)
emergency.put('/reports/:id/status', authMiddleware, adminMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const reportId = c.req.param('id');
    const body = c.get('body') || await c.req.json();
    const { status, assignedTo, notes } = sanitizeInput(body);

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    // Get current report
    const [currentReport] = await Database.query(
      'SELECT * FROM emergency_reports WHERE id = ?',
      [reportId]
    );

    if (!currentReport) {
      return c.json({ error: 'Emergency report not found' }, 404);
    }

    // Update report
    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];

    if (assignedTo) {
      updates.push('assigned_to = ?');
      params.push(assignedTo);
    }

    if (notes && status === 'resolved') {
      updates.push('resolution_notes = ?');
      params.push(notes);
    }

    params.push(reportId);

    await Database.query(
      `UPDATE emergency_reports SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log status change in report_updates
    await Database.query(
      `INSERT INTO report_updates (report_id, report_type, old_status, new_status, updated_by, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [reportId, 'emergency', currentReport.status, status, user.id, notes || null]
    );

    // Create notification for reporter (if not anonymous)
    if (currentReport.user_id) {
      const statusMessages = {
        'in_progress': 'Your emergency report is being handled by our team.',
        'resolved': 'Your emergency report has been resolved.',
        'closed': 'Your emergency report has been closed.'
      };

      await Database.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, related_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          currentReport.user_id,
          `Emergency Report Update - ${currentReport.reference_id}`,
          statusMessages[status] || `Status updated to: ${status}`,
          'emergency',
          reportId,
          'emergency_report'
        ]
      );
    }

    // Log action
    await logAction(user.id, 'UPDATE_EMERGENCY_STATUS', 'emergency_report', reportId, { 
      oldStatus: currentReport.status, 
      newStatus: status,
      assignedTo 
    }, c.req);

    return c.json({
      message: 'Emergency report status updated successfully',
      status,
      assignedTo
    });

  } catch (error) {
    console.error('Update emergency status error:', error);
    return c.json({ error: 'Failed to update emergency report status' }, 500);
  }
});

// Get emergency statistics (admin only)
emergency.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  try {
    // Get overall statistics
    const [totalReports] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports');
    const [pendingReports] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports WHERE status = "pending"');
    const [resolvedReports] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports WHERE status = "resolved"');
    const [criticalReports] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports WHERE priority = "critical"');

    // Get reports by type
    const reportsByType = await Database.query(
      'SELECT emergency_type, COUNT(*) as count FROM emergency_reports GROUP BY emergency_type ORDER BY count DESC'
    );

    // Get reports by status
    const reportsByStatus = await Database.query(
      'SELECT status, COUNT(*) as count FROM emergency_reports GROUP BY status'
    );

    // Get recent reports (last 30 days)
    const recentReports = await Database.query(
      'SELECT COUNT(*) as count FROM emergency_reports WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    return c.json({
      overview: {
        total: totalReports.count,
        pending: pendingReports.count,
        resolved: resolvedReports.count,
        critical: criticalReports.count,
        recentReports: recentReports[0].count
      },
      reportsByType,
      reportsByStatus
    });

  } catch (error) {
    console.error('Get emergency stats error:', error);
    return c.json({ error: 'Failed to get emergency statistics' }, 500);
  }
});

module.exports = emergency;
