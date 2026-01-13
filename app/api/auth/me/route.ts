// Get current user endpoint - GET /api/auth/me
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withAuth,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      // Get additional user details
      const [userDetails] = await Database.query(
        `SELECT id, firstName, lastName, email, role, studentId, phoneNumber, 
                isVerified, profileImage, createdAt, updatedAt 
         FROM users WHERE id = ?`,
        [user.id]
      );

      return successResponse({ user: userDetails });

    } catch (error) {
      console.error('Get user error:', error);
      return errorResponse('Failed to get user details', 500);
    }
  });
}
