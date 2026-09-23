export const dynamic = 'force-dynamic';

// Change password endpoint - PUT /api/auth/change-password
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  requireAuth,
  hashPassword,
  comparePassword,
  generateToken,
  setAuthCookie,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { enforceRateLimit } from '@/lib/rate-limit';
import { parseBody, changePasswordSchema } from '@/lib/validation';

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // Guessing the current password here is as good as guessing it at the
  // login screen, so the same kind of limit applies.
  const limited = await enforceRateLimit(request, 'change-password', 5, 15 * 60, String(auth.user.id));
  if (limited) return limited;

  try {
    // The schema enforces the full password policy, which the old inline
    // check (six characters, no character classes) did not.
    const parsed = await parseBody(request, changePasswordSchema);
    if (!parsed.ok) return parsed.response;

    const { currentPassword, newPassword } = parsed.data;

    const [userData] = await Database.query('SELECT password FROM users WHERE id = ?', [
      auth.user.id,
    ]);

    if (!userData) {
      return errorResponse('Account not found', 404);
    }

    const isValidPassword = await comparePassword(currentPassword, userData.password);

    if (!isValidPassword) {
      return errorResponse('Current password is incorrect', 401);
    }

    if (currentPassword === newPassword) {
      return errorResponse('New password must be different from the current one', 400);
    }

    const hashedNewPassword = await hashPassword(newPassword);

    // Bumping tokenVersion in the same statement revokes every session
    // issued under the old password. Returning it means the replacement
    // token below is minted at the new version rather than the old one.
    const [updated] = await Database.query(
      `UPDATE users
          SET password = ?, tokenVersion = tokenVersion + 1, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING tokenVersion`,
      [hashedNewPassword, auth.user.id]
    );

    await logAction(auth.user.id, 'CHANGE_PASSWORD', 'users', auth.user.id, {}, request);

    // A fresh session so the person changing their password keeps working,
    // while every other device holding the old token is signed out — which
    // is the point of changing it after a compromise.
    const token = generateToken(auth.user.id, updated?.tokenVersion ?? 0);
    const response = successResponse({ token }, 'Password changed successfully');

    return setAuthCookie(response, token);
  } catch (error) {
    return serverErrorResponse('Change password error', error, 'Failed to change password');
  }
}
