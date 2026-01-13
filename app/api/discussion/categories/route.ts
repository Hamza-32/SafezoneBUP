// Discussion Categories API - GET /api/discussion/categories
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  try {
    const categories = await Database.query(`
      SELECT 
        id, name, description, color, requiresModeration,
        (SELECT COUNT(*) FROM discussion_posts WHERE categoryId = discussion_categories.id AND status = 'approved') as postCount
      FROM discussion_categories 
      WHERE isActive = TRUE
      ORDER BY name ASC
    `);

    return successResponse({
      categories,
      total: categories.length
    });

  } catch (error) {
    console.error('Discussion categories error:', error);
    return errorResponse('Failed to fetch discussion categories', 500);
  }
}
