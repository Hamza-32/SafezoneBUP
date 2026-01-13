// Discussion Posts API - GET /api/discussion/posts
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
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') || 'approved';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.id, p.title, p.content, p.isAnonymous, p.status, 
        p.upvotes, p.downvotes, p.createdAt, p.updatedAt,
        c.name as categoryName, c.color as categoryColor,
        CASE 
          WHEN p.isAnonymous = TRUE THEN 'Anonymous' 
          ELSE CONCAT(u.firstName, ' ', u.lastName) 
        END as authorName,
        (SELECT COUNT(*) FROM discussion_comments WHERE postId = p.id AND status = 'approved') as commentCount
      FROM discussion_posts p
      LEFT JOIN discussion_categories c ON p.categoryId = c.id
      LEFT JOIN users u ON p.authorId = u.id
      WHERE p.status = ?
    `;
    const params: any[] = [status];

    if (categoryId) {
      query += ' AND p.categoryId = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = await Database.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM discussion_posts WHERE status = ?';
    const countParams: any[] = [status];
    
    if (categoryId) {
      countQuery += ' AND categoryId = ?';
      countParams.push(categoryId);
    }

    const [{ total }] = await Database.query(countQuery, countParams);

    return successResponse({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Discussion posts error:', error);
    return errorResponse('Failed to fetch discussion posts', 500);
  }
}

// Create new discussion post
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      const body = await request.json();
      const { title, content, categoryId, isAnonymous = true } = body;

      if (!title || !content || !categoryId) {
        return errorResponse('Missing required fields', 400);
      }

      // Check if category exists and requires moderation
      const [category] = await Database.query(
        'SELECT requiresModeration FROM discussion_categories WHERE id = ? AND isActive = TRUE',
        [categoryId]
      );

      if (!category) {
        return errorResponse('Invalid category', 400);
      }

      const status = category.requiresModeration ? 'pending' : 'approved';

      const result = await Database.query(
        `INSERT INTO discussion_posts 
         (categoryId, title, content, authorId, isAnonymous, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [categoryId, title, content, user.id, isAnonymous, status]
      );

      return successResponse({
        id: result.insertId,
        status,
        message: status === 'pending' 
          ? 'Post submitted for moderation' 
          : 'Post created successfully'
      });

    } catch (error) {
      console.error('Create discussion post error:', error);
      return errorResponse('Failed to create discussion post', 500);
    }
  });
}
