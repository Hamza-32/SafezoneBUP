export const dynamic = 'force-dynamic';

// Discussion Posts API - GET /api/discussion/posts
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { enforceRateLimit } from '@/lib/rate-limit';
import { optionalUser } from '@/lib/api-middleware';
import { 
  successResponse,
  errorResponse,
  withAuth
} from '@/lib/api-middleware';
import { parsePagination } from '@/lib/validation';

/** Statuses a moderator may ask for. Anyone else gets approved posts only. */
const MODERATOR_STATUSES = new Set(['pending', 'rejected', 'flagged', 'approved']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    // status came straight from the query string, so
    // ?status=pending returned posts held for moderation to any
    // unauthenticated caller, and ?status=rejected returned ones a moderator
    // had already refused. On an anonymous board for mental health and
    // campus safety, unreviewed content is the most sensitive content there
    // is, and withholding it is the entire point of moderating.
    //
    // Anything other than 'approved' now requires staff. A student asking
    // for pending posts silently gets approved ones rather than an error,
    // because the existence of a moderation queue is not itself a secret and
    // a 403 here would only invite probing.
    const requestedStatus = searchParams.get('status') || 'approved';
    const viewer = await optionalUser(request);
    const isModerator = viewer?.role === 'admin' || viewer?.role === 'security';

    const status =
      isModerator && MODERATOR_STATUSES.has(requestedStatus) ? requestedStatus : 'approved';
    const { page, limit, offset } = parsePagination(searchParams, {
      defaultLimit: 10,
    });

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
    // Per account rather than per address: the board is anonymous to other
    // readers, so the address alone would let one person behind a shared
    // campus NAT exhaust everyone else's allowance.
    const limited = await enforceRateLimit(request, 'discussion-post', 10, 60 * 60, String(user.id));
    if (limited) return limited;

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
