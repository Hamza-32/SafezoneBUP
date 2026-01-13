const jwt = require('jsonwebtoken');
const { Database } = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'safezone-jwt-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Authentication middleware
const authMiddleware = async (c, next) => {
  try {
    const authHeader = c.req.header('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Access denied. No token provided.' }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from database
      const users = await Database.query(
        'SELECT id, name, email, role, student_id, phone, department, is_verified FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0) {
        return c.json({ error: 'Invalid token. User not found.' }, 401);
      }

      // Add user to context
      c.set('user', users[0]);
      await next();
      
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return c.json({ error: 'Invalid token.' }, 401);
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Authentication failed.' }, 500);
  }
};

// Admin role middleware
const adminMiddleware = async (c, next) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Access denied. Admin privileges required.' }, 403);
  }
  
  await next();
};

// Optional auth middleware (doesn't require authentication)
const optionalAuthMiddleware = async (c, next) => {
  try {
    const authHeader = c.req.header('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const users = await Database.query(
          'SELECT id, name, email, role, student_id, phone, department, is_verified FROM users WHERE id = ?',
          [decoded.userId]
        );

        if (users.length > 0) {
          c.set('user', users[0]);
        }
      } catch (tokenError) {
        // Invalid token, but we continue without user
        console.log('Optional auth: Invalid token, continuing without user');
      }
    }
    
    await next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    await next(); // Continue even if error occurs
  }
};

// JWT utilities
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Log user action for audit
const logAction = async (userId, action, resourceType, resourceId = null, details = {}, req = null) => {
  try {
    const ipAddress = req?.header('x-forwarded-for') || req?.header('x-real-ip') || 'unknown';
    const userAgent = req?.header('user-agent') || 'unknown';

    await Database.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Error logging action:', error);
    // Don't throw error for logging failures
  }
};

// Generate reference ID for reports
const generateReferenceId = (prefix = 'REF') => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp.slice(-6)}${random}`;
};

// Validate required fields
const validateRequiredFields = (data, requiredFields) => {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  return missing;
};

// Sanitize input data
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return data.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  generateToken,
  verifyToken,
  logAction,
  generateReferenceId,
  validateRequiredFields,
  sanitizeInput,
  JWT_SECRET
};
