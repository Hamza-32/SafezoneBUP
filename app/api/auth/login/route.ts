export const dynamic = 'force-dynamic';

// Login endpoint - POST /api/auth/login
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  comparePassword,
  burnPasswordComparison,
  generateToken,
  assertSameOrigin,
  setAuthCookie,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { enforceRateLimit } from '@/lib/rate-limit';
import { parseBody, loginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  // Two limits: one on the address, one on the target account. The first
  // slows a single host spraying many accounts, the second slows a
  // distributed attack against one account.
  const ipLimited = await enforceRateLimit(request, 'login-ip', 10, 15 * 60);
  if (ipLimited) return ipLimited;

  try {
    const parsed = await parseBody(request, loginSchema);
    if (!parsed.ok) return parsed.response;

    const { email, password } = parsed.data;

    const accountLimited = await enforceRateLimit(request, 'login-account', 5, 15 * 60, email);
    if (accountLimited) return accountLimited;

    const users = await Database.query(
      'SELECT id, firstName, lastName, email, password, role, studentId, phoneNumber, isVerified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Spend the same time as a real check so response timing does not
      // reveal whether the address is registered.
      await burnPasswordComparison(password);
      return errorResponse('Invalid credentials', 401);
    }

    const user = users[0];

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return errorResponse('Invalid credentials', 401);
    }

    delete user.password;

    const token = generateToken(user.id);

    await logAction(user.id, 'LOGIN', 'users', user.id, { role: user.role }, request);

    const response = successResponse({ user, token }, 'Login successful');

    return setAuthCookie(response, token);
  } catch (error) {
    return serverErrorResponse('Login error', error, 'Login failed');
  }
}
