// Login endpoint - POST /api/auth/login
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  comparePassword,
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
    const { email, password } = sanitizeInput(body);

    // Validate required fields
    const missing = validateRequiredFields({ email, password }, ['email', 'password']);
    
    if (missing.length > 0) {
      return errorResponse('Missing required fields', 400, { missing });
    }

    // Find user by email (role is not needed for login)
    const users = await Database.query(
      'SELECT id, firstName, lastName, email, password, role, studentId, phoneNumber, isVerified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return errorResponse('Invalid credentials', 401);
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    
    if (!isValidPassword) {
      return errorResponse('Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    delete user.password;

    // Log action
    await logAction(user.id, 'LOGIN', 'users', user.id, { role: user.role }, request);

    return successResponse({
      user,
      token
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Login failed', 500);
  }
}
