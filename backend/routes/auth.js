const { Hono } = require('hono');
const bcrypt = require('bcryptjs');
const { Database } = require('../database/connection');
const { 
  generateToken, 
  authMiddleware, 
  logAction, 
  validateRequiredFields, 
  sanitizeInput 
} = require('../middleware/auth');

const auth = new Hono();

// Register endpoint
auth.post('/register', async (c) => {
  try {
    const body = c.get('body') || await c.req.json();
    const { name, email, password, role, studentId, phone, department, year } = sanitizeInput(body);

    // Validate required fields
    const requiredFields = ['name', 'email', 'password', 'role'];
    const missing = validateRequiredFields({ name, email, password, role }, requiredFields);
    
    if (missing.length > 0) {
      return c.json({ 
        error: 'Missing required fields', 
        missing: missing 
      }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Validate password strength
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    // Validate role
    if (!['student', 'admin'].includes(role)) {
      return c.json({ error: 'Invalid role. Must be either "student" or "admin"' }, 400);
    }

    // Check if user already exists
    const existingUser = await Database.query(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );

    if (existingUser.length > 0) {
      return c.json({ error: 'User with this email already exists' }, 409);
    }

    // Check if student ID is already taken (for students)
    if (role === 'student' && studentId) {
      const existingStudent = await Database.query(
        'SELECT id FROM users WHERE student_id = ?', 
        [studentId]
      );

      if (existingStudent.length > 0) {
        return c.json({ error: 'Student ID already exists' }, 409);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await Database.query(
      `INSERT INTO users (name, email, password, role, student_id, phone, department, year) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, studentId || null, phone || null, department || null, year || null]
    );

    const userId = result.insertId;

    // Generate token
    const token = generateToken(userId);

    // Get created user (without password)
    const [user] = await Database.query(
      'SELECT id, name, email, role, student_id, phone, department, year, is_verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    // Log action
    await logAction(userId, 'REGISTER', 'user', userId, { role }, c.req);

    return c.json({
      message: 'User registered successfully',
      user,
      token
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Login endpoint
auth.post('/login', async (c) => {
  try {
    const body = c.get('body') || await c.req.json();
    const { email, password, role } = sanitizeInput(body);

    // Validate required fields
    const missing = validateRequiredFields({ email, password, role }, ['email', 'password', 'role']);
    
    if (missing.length > 0) {
      return c.json({ 
        error: 'Missing required fields', 
        missing: missing 
      }, 400);
    }

    // Find user by email and role
    const users = await Database.query(
      'SELECT id, name, email, password, role, student_id, phone, department, year, is_verified FROM users WHERE email = ? AND role = ?',
      [email, role]
    );

    if (users.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    delete user.password;

    // Log action
    await logAction(user.id, 'LOGIN', 'user', user.id, { role }, c.req);

    return c.json({
      message: 'Login successful',
      user,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Get current user endpoint
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Get additional user details
    const [userDetails] = await Database.query(
      `SELECT id, name, email, role, student_id, phone, department, year, 
              is_verified, profile_image, created_at, updated_at 
       FROM users WHERE id = ?`,
      [user.id]
    );

    return c.json({
      user: userDetails
    });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user details' }, 500);
  }
});

// Update profile endpoint
auth.put('/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = c.get('body') || await c.req.json();
    const { name, phone, department, year } = sanitizeInput(body);

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (department) {
      updates.push('department = ?');
      values.push(department);
    }
    if (year !== undefined) {
      updates.push('year = ?');
      values.push(year);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    values.push(user.id);

    await Database.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated user
    const [updatedUser] = await Database.query(
      'SELECT id, name, email, role, student_id, phone, department, year, is_verified, created_at, updated_at FROM users WHERE id = ?',
      [user.id]
    );

    // Log action
    await logAction(user.id, 'UPDATE_PROFILE', 'user', user.id, { updates: Object.keys(body) }, c.req);

    return c.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Change password endpoint
auth.put('/change-password', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = c.get('body') || await c.req.json();
    const { currentPassword, newPassword } = sanitizeInput(body);

    // Validate required fields
    const missing = validateRequiredFields({ currentPassword, newPassword }, ['currentPassword', 'newPassword']);
    
    if (missing.length > 0) {
      return c.json({ 
        error: 'Missing required fields', 
        missing: missing 
      }, 400);
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return c.json({ error: 'New password must be at least 6 characters long' }, 400);
    }

    // Get current password hash
    const [userData] = await Database.query(
      'SELECT password FROM users WHERE id = ?',
      [user.id]
    );

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userData.password);
    
    if (!isValidPassword) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await Database.query(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, user.id]
    );

    // Log action
    await logAction(user.id, 'CHANGE_PASSWORD', 'user', user.id, {}, c.req);

    return c.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

// Logout endpoint (mainly for logging purposes)
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // Log action
    await logAction(user.id, 'LOGOUT', 'user', user.id, {}, c.req);

    return c.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

module.exports = auth;
