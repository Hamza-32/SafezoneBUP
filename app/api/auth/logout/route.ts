export const dynamic = 'force-dynamic';

// Logout endpoint - POST /api/auth/logout
import { NextRequest } from 'next/server';
import {
  optionalUser,
  assertSameOrigin,
  clearAuthCookie,
  logAction,
  successResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  try {
    // Logout deliberately does not require a valid session. Someone holding
    // an expired or malformed token must still be able to clear it.
    const user = await optionalUser(request);

    if (user) {
      await logAction(user.id, 'LOGOUT', 'users', user.id, {}, request);
    }

    const response = successResponse(null, 'Logged out successfully');

    return clearAuthCookie(response);
  } catch (error) {
    return serverErrorResponse('Logout error', error, 'Logout failed');
  }
}
