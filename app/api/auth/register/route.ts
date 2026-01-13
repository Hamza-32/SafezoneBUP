// Register endpoint - POST /api/auth/register
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  hashPassword, 
  generateToken, 
  validateRequiredFields, 
  sanitizeInput, 
  logAction,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, role, studentId, phoneNumber } = sanitizeInput(body);

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'role'];
    const missing = validateRequiredFields({ firstName, lastName, email, password, role }, requiredFields);
    
    if (missing.length > 0) {
      return errorResponse('Missing required fields', 400, { missing });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format', 400);
    }

    // Validate password strength
    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters long', 400);
    }

    // Validate role
    if (!['student', 'admin', 'security'].includes(role)) {
      return errorResponse('Invalid role. Must be student, admin, or security', 400);
    }

    // Check if user already exists
    const existingUser = await Database.query(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );

    if (existingUser.length > 0) {
      return errorResponse('User with this email already exists', 409);
    }

    // Check if student ID is already taken (for students)
    if (role === 'student' && studentId) {
      const existingStudent = await Database.query(
        'SELECT id FROM users WHERE studentId = ?', 
        [studentId]
      );

      if (existingStudent.length > 0) {
        return errorResponse('Student ID already exists', 409);
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await Database.query(
      `INSERT INTO users (firstName, lastName, email, password, role, studentId, phoneNumber) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, hashedPassword, role, studentId || null, phoneNumber || null]
    );

    const userId = result.insertId;

    // Generate token
    const token = generateToken(userId);

    // Get created user (without password)
    const [user] = await Database.query(
      'SELECT id, firstName, lastName, email, role, studentId, phoneNumber, isVerified, createdAt FROM users WHERE id = ?',
      [userId]
    );

    // Log action
    await logAction(userId, 'REGISTER', 'users', userId, { role }, request);

    return successResponse({
      user,
      token
    }, 'User registered successfully', 201);

  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Registration failed', 500);
  }
}
