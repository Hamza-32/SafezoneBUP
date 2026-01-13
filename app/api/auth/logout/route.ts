// Logout endpoint - POST /api/auth/logout
import { NextRequest } from 'next/server';
import { 
  withAuth,
  logAction,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      // Log action
      await logAction(user.id, 'LOGOUT', 'users', user.id, {}, request);

      return successResponse(null, 'Logged out successfully');

    } catch (error) {
      console.error('Logout error:', error);
      return errorResponse('Logout failed', 500);
    }
  });
}
