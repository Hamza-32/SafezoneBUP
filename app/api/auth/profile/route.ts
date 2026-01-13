// Update profile endpoint - PUT /api/auth/profile
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withAuth,
  sanitizeInput, 
  logAction,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      const body = await request.json();
      const { firstName, lastName, phoneNumber } = sanitizeInput(body);

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (firstName) {
        updates.push('firstName = ?');
        values.push(firstName);
      }
      if (lastName) {
        updates.push('lastName = ?');
        values.push(lastName);
      }
      if (phoneNumber) {
        updates.push('phoneNumber = ?');
        values.push(phoneNumber);
      }

      if (updates.length === 0) {
        return errorResponse('No fields to update', 400);
      }

      values.push(user.id);

      await Database.query(
        `UPDATE users SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      // Get updated user
      const [updatedUser] = await Database.query(
        'SELECT id, firstName, lastName, email, role, studentId, phoneNumber, isVerified, createdAt, updatedAt FROM users WHERE id = ?',
        [user.id]
      );

      // Log action
      await logAction(user.id, 'UPDATE_PROFILE', 'users', user.id, { updates: Object.keys(body) }, request);

      return successResponse({
        user: updatedUser
      }, 'Profile updated successfully');

    } catch (error) {
      console.error('Profile update error:', error);
      return errorResponse('Failed to update profile', 500);
    }
  });
}
