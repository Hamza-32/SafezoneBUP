export const dynamic = 'force-dynamic';

// Safety Resources API - GET /api/safety/resources
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  successResponse,
  errorResponse,
  withAuth
} from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let query = `
      SELECT 
        id, title, description, category, content, contactInfo, 
        priority, createdAt, updatedAt
      FROM safety_resources 
      WHERE isActive = TRUE
    `;
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY priority DESC, createdAt DESC';

    const resources = await Database.query(query, params);

    // Parse JSON contact info
    const processedResources = resources.map(resource => ({
      ...resource,
      contactInfo: typeof resource.contactInfo === 'string' 
        ? JSON.parse(resource.contactInfo) 
        : resource.contactInfo
    }));

    return successResponse({
      resources: processedResources,
      total: processedResources.length
    });

  } catch (error) {
    console.error('Safety resources error:', error);
    return errorResponse('Failed to fetch safety resources', 500);
  }
}

// Create new safety resource (admin only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      if (user.role !== 'admin') {
        return errorResponse('Access denied', 403);
      }

      const body = await request.json();
      const { title, description, category, content, contactInfo, priority = 0 } = body;

      if (!title || !category || !content) {
        return errorResponse('Missing required fields', 400);
      }

      const result = await Database.query(
        `INSERT INTO safety_resources 
         (title, description, category, content, contactInfo, priority, createdBy) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          title, 
          description, 
          category, 
          content, 
          JSON.stringify(contactInfo || {}), 
          priority, 
          user.id
        ]
      );

      return successResponse({
        id: result.insertId,
        message: 'Safety resource created successfully'
      }, 'Resource created successfully');

    } catch (error) {
      console.error('Create safety resource error:', error);
      return errorResponse('Failed to create safety resource', 500);
    }
  });
}
