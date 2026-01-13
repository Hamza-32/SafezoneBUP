// Change password endpoint - PUT /api/auth/change-password
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withAuth,
  hashPassword,
  comparePassword,
  validateRequiredFields, 
  sanitizeInput, 
  logAction,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      const body = await request.json();
      const { currentPassword, newPassword } = sanitizeInput(body);

      // Validate required fields
      const missing = validateRequiredFields({ currentPassword, newPassword }, ['currentPassword', 'newPassword']);
      
      if (missing.length > 0) {
        return errorResponse('Missing required fields', 400, { missing });
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        return errorResponse('New password must be at least 6 characters long', 400);
      }

      // Get current password hash
      const [userData] = await Database.query(
        'SELECT password FROM users WHERE id = ?',
        [user.id]
      );

      // Verify current password
      const isValidPassword = await comparePassword(currentPassword, userData.password);
      
      if (!isValidPassword) {
        return errorResponse('Current password is incorrect', 401);
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      await Database.query(
        'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, user.id]
      );

      // Log action
      await logAction(user.id, 'CHANGE_PASSWORD', 'users', user.id, {}, request);

      return successResponse(null, 'Password changed successfully');

    } catch (error) {
      console.error('Change password error:', error);
      return errorResponse('Failed to change password', 500);
    }
  });
}
