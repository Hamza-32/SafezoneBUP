export const dynamic = 'force-dynamic';

// Register endpoint - POST /api/auth/register
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  hashPassword,
  generateToken,
  optionalUser,
  assertSameOrigin,
  setAuthCookie,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { enforceRateLimit } from '@/lib/rate-limit';
import { parseBody, registerSchema, adminCreateUserSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  // Cap account creation per address so the user table cannot be flooded.
  const limited = await enforceRateLimit(request, 'register', 5, 60 * 60);
  if (limited) return limited;

  try {
    // Only an authenticated administrator may choose the role of a new
    // account. For everyone else the role is fixed at 'student', so a
    // self-service signup can never mint an admin or security account.
    const caller = await optionalUser(request);
    const callerIsAdmin = caller?.role === 'admin';

    const parsed = await parseBody(
      request,
      callerIsAdmin ? adminCreateUserSchema : registerSchema
    );
    if (!parsed.ok) return parsed.response;

    const { firstName, lastName, email, password, studentId, phoneNumber } = parsed.data;
    const role = callerIsAdmin ? (parsed.data as { role: string }).role : 'student';

    // Check if user already exists
    const existingUser = await Database.query('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      return errorResponse('User with this email already exists', 409);
    }

    // Check if student ID is already taken
    if (studentId) {
      const existingStudent = await Database.query('SELECT id FROM users WHERE studentId = ?', [
        studentId,
      ]);

      if (existingStudent.length > 0) {
        return errorResponse('Student ID already exists', 409);
      }
    }

    const hashedPassword = await hashPassword(password);

    const result = await Database.query(
      `INSERT INTO users (firstName, lastName, email, password, role, studentId, phoneNumber)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, hashedPassword, role, studentId || null, phoneNumber || null]
    );

    const userId = result.insertId;

    const [user] = await Database.query(
      'SELECT id, firstName, lastName, email, role, studentId, phoneNumber, isVerified, createdAt FROM users WHERE id = ?',
      [userId]
    );

    await logAction(
      caller?.id ?? userId,
      callerIsAdmin ? 'ADMIN_CREATE_USER' : 'REGISTER',
      'users',
      userId,
      { role },
      request
    );

    // An admin provisioning someone else must not have their own session
    // replaced by the new account's token.
    if (callerIsAdmin) {
      return successResponse({ user }, 'User created successfully', 201);
    }

    const token = generateToken(userId);
    const response = successResponse({ user, token }, 'User registered successfully', 201);

    return setAuthCookie(response, token);
  } catch (error) {
    return serverErrorResponse('Registration error', error, 'Registration failed');
  }
}
