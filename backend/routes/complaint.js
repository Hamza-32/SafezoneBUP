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

const complaint = new Hono();

// Create complaint endpoint (with optional authentication)
complaint.post('/report', optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = c.get('body') || await c.req.json();
    const {
      title,
      category,
      description,
      location,
      isAnonymous,
      contactInfo
    } = sanitizeInput(body);

    // Validate required fields
    const requiredFields = ['title', 'category', 'description'];
    const missing = validateRequiredFields({ title, category, description }, requiredFields);
    
    if (missing.length > 0) {
      return c.json({ 
        error: 'Missing required fields', 
        missing: missing 
      }, 400);
    }

    // Generate reference ID
    const referenceId = generateReferenceId('CPL');

    // Determine priority based on category
    let priority = 'medium';
    const highPriorityCategories = ['Safety', 'Security', 'Harassment', 'Violence'];
    if (highPriorityCategories.some(cat => category.toLowerCase().includes(cat.toLowerCase()))) {
      priority = 'high';
    }

    // Create complaint
    const result = await Database.query(
      `INSERT INTO complaints 
       (reference_id, user_id, title, category, description, location, 
        is_anonymous, contact_info, priority) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        referenceId,
        user?.id || null,
        title,
        category,
        description,
        location || null,
        isAnonymous || false,
        contactInfo || null,
        priority
      ]
    );

    const complaintId = result.insertId;

    // Create notification for admins
    const admins = await Database.query('SELECT id FROM users WHERE role = "admin"');
    
    for (const admin of admins) {
      await Database.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, related_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          admin.id,
          `📋 New Complaint - ${category}`,
          `New complaint titled "${title}" has been submitted. Priority: ${priority.toUpperCase()}. Reference: ${referenceId}`,
          'complaint',
          complaintId,
          'complaint'
        ]
      );
    }

    // Log action
    if (user) {
      await logAction(user.id, 'CREATE_COMPLAINT', 'complaint', complaintId, { 
        category, 
        priority,
        isAnonymous 
      }, c.req);
    }

    return c.json({
      message: 'Complaint submitted successfully',
      referenceId,
      priority,
      complaintId
    }, 201);

  } catch (error) {
    console.error('Complaint submission error:', error);
    return c.json({ error: 'Failed to submit complaint' }, 500);
  }
});

// Get all complaints (admin only)
complaint.get('/reports', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = c.req.query() || {};
    
    let query = `
      SELECT 
        c.*,
        u.name as reporter_name,
        u.student_id,
        assigned_admin.name as assigned_admin_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users assigned_admin ON c.assigned_to = assigned_admin.id
    `;
    
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    if (category) {
      conditions.push('c.category = ?');
      params.push(category);
    }

    if (priority) {
      conditions.push('c.priority = ?');
      params.push(priority);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.created_at DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const complaints = await Database.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM complaints c';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const [{ total }] = await Database.query(countQuery, params.slice(0, -2));

    return c.json({
      complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get complaints error:', error);
    return c.json({ error: 'Failed to get complaints' }, 500);
  }
});

// Get user's complaints
complaint.get('/my-reports', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const complaints = await Database.query(
      `SELECT 
        c.*,
        assigned_admin.name as assigned_admin_name
       FROM complaints c
       LEFT JOIN users assigned_admin ON c.assigned_to = assigned_admin.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [user.id]
    );

    return c.json({
      complaints
    });

  } catch (error) {
    console.error('Get user complaints error:', error);
    return c.json({ error: 'Failed to get your complaints' }, 500);
  }
});

// Get complaint by ID
complaint.get('/reports/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const complaintId = c.req.param('id');

    let query = `
      SELECT 
        c.*,
        u.name as reporter_name,
        u.student_id,
        assigned_admin.name as assigned_admin_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users assigned_admin ON c.assigned_to = assigned_admin.id
      WHERE c.id = ?
    `;

    // If not admin, only allow viewing own complaints
    if (user.role !== 'admin') {
      query += ' AND c.user_id = ?';
    }

    const params = user.role === 'admin' ? [complaintId] : [complaintId, user.id];
    const complaints = await Database.query(query, params);

    if (complaints.length === 0) {
      return c.json({ error: 'Complaint not found' }, 404);
    }

    const complaintData = complaints[0];

    // Get status update history
    const updates = await Database.query(
      `SELECT 
        ru.*,
        u.name as updated_by_name
       FROM report_updates ru
       LEFT JOIN users u ON ru.updated_by = u.id
       WHERE ru.report_id = ? AND ru.report_type = 'complaint'
       ORDER BY ru.created_at DESC`,
      [complaintId]
    );

    return c.json({
      complaint: complaintData,
      updates
    });

  } catch (error) {
    console.error('Get complaint error:', error);
    return c.json({ error: 'Failed to get complaint' }, 500);
  }
});

// Update complaint status (admin only)
complaint.put('/reports/:id/status', authMiddleware, adminMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const complaintId = c.req.param('id');
    const body = c.get('body') || await c.req.json();
    const { status, assignedTo, notes } = sanitizeInput(body);

    // Validate status
    const validStatuses = ['pending', 'under_review', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    // Get current complaint
    const [currentComplaint] = await Database.query(
      'SELECT * FROM complaints WHERE id = ?',
      [complaintId]
    );

    if (!currentComplaint) {
      return c.json({ error: 'Complaint not found' }, 404);
    }

    // Update complaint
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

    params.push(complaintId);

    await Database.query(
      `UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log status change in report_updates
    await Database.query(
      `INSERT INTO report_updates (report_id, report_type, old_status, new_status, updated_by, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [complaintId, 'complaint', currentComplaint.status, status, user.id, notes || null]
    );

    // Create notification for reporter (if not anonymous)
    if (currentComplaint.user_id) {
      const statusMessages = {
        'under_review': 'Your complaint is being reviewed by our team.',
        'resolved': 'Your complaint has been resolved.',
        'closed': 'Your complaint has been closed.'
      };

      await Database.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, related_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          currentComplaint.user_id,
          `Complaint Update - ${currentComplaint.reference_id}`,
          statusMessages[status] || `Status updated to: ${status}`,
          'complaint',
          complaintId,
          'complaint'
        ]
      );
    }

    // Log action
    await logAction(user.id, 'UPDATE_COMPLAINT_STATUS', 'complaint', complaintId, { 
      oldStatus: currentComplaint.status, 
      newStatus: status,
      assignedTo 
    }, c.req);

    return c.json({
      message: 'Complaint status updated successfully',
      status,
      assignedTo
    });

  } catch (error) {
    console.error('Update complaint status error:', error);
    return c.json({ error: 'Failed to update complaint status' }, 500);
  }
});

// Get complaint categories
complaint.get('/categories', async (c) => {
  try {
    const categories = [
      'Infrastructure',
      'Safety',
      'Security',
      'Harassment',
      'Academic',
      'Food Services',
      'Transportation',
      'Facilities',
      'Technology',
      'Other'
    ];

    return c.json({
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to get categories' }, 500);
  }
});

// Get complaint statistics (admin only)
complaint.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  try {
    // Get overall statistics
    const [totalComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints');
    const [pendingComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints WHERE status = "pending"');
    const [resolvedComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints WHERE status = "resolved"');
    const [underReviewComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints WHERE status = "under_review"');

    // Get complaints by category
    const complaintsByCategory = await Database.query(
      'SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC'
    );

    // Get complaints by status
    const complaintsByStatus = await Database.query(
      'SELECT status, COUNT(*) as count FROM complaints GROUP BY status'
    );

    // Get recent complaints (last 30 days)
    const recentComplaints = await Database.query(
      'SELECT COUNT(*) as count FROM complaints WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    return c.json({
      overview: {
        total: totalComplaints.count,
        pending: pendingComplaints.count,
        underReview: underReviewComplaints.count,
        resolved: resolvedComplaints.count,
        recentComplaints: recentComplaints[0].count
      },
      complaintsByCategory,
      complaintsByStatus
    });

  } catch (error) {
    console.error('Get complaint stats error:', error);
    return c.json({ error: 'Failed to get complaint statistics' }, 500);
  }
});

module.exports = complaint;
