export const dynamic = 'force-dynamic';

// Update profile endpoint - PUT /api/auth/profile
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  requireAuth,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { parseBody, updateProfileSchema } from '@/lib/validation';

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const parsed = await parseBody(request, updateProfileSchema);
    if (!parsed.ok) return parsed.response;

    // Column names come from this fixed list, never from the request body,
    // and only supplied fields are written so a partial edit cannot blank
    // out the others.
    const updatable = ['firstName', 'lastName', 'phoneNumber', 'studentId'] as const;

    const setClauses: string[] = [];
    const values: any[] = [];

    for (const column of updatable) {
      const value = (parsed.data as Record<string, unknown>)[column];
      if (value !== undefined) {
        setClauses.push(`${column} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    // A student id has to stay unique, so reject a clash rather than let the
    // unique index surface as an opaque 500.
    if (parsed.data.studentId) {
      const clash = await Database.query(
        'SELECT id FROM users WHERE studentId = ? AND id <> ?',
        [parsed.data.studentId, auth.user.id]
      );

      if (clash.length > 0) {
        return errorResponse('That student ID is already registered', 409);
      }
    }

    values.push(auth.user.id);

    await Database.query(
      `UPDATE users SET ${setClauses.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const [updatedUser] = await Database.query(
      `SELECT id, firstName, lastName, email, role, studentId, phoneNumber, isVerified,
              createdAt, updatedAt
       FROM users WHERE id = ?`,
      [auth.user.id]
    );

    await logAction(
      auth.user.id,
      'UPDATE_PROFILE',
      'users',
      auth.user.id,
      { fields: setClauses.map((clause) => clause.split(' ')[0]) },
      request
    );

    return successResponse({ user: updatedUser }, 'Profile updated successfully');
  } catch (error) {
    return serverErrorResponse('Profile update error', error, 'Failed to update profile');
  }
}
