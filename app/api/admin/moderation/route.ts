// Admin Moderation API - GET /api/admin/moderation
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withAdmin,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  return withAdmin(request, async (req: NextRequest, user: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type') || 'all'; // 'posts', 'comments', 'all'

      let pendingPosts = [];
      let pendingComments = [];

      if (type === 'posts' || type === 'all') {
        pendingPosts = await Database.query(`
          SELECT 
            p.id, p.title, p.content, p.isAnonymous, p.createdAt,
            c.name as categoryName,
            CASE 
              WHEN p.isAnonymous = TRUE THEN 'Anonymous' 
              ELSE CONCAT(u.firstName, ' ', u.lastName) 
            END as authorName,
            u.email as authorEmail
          FROM discussion_posts p
          LEFT JOIN discussion_categories c ON p.categoryId = c.id
          LEFT JOIN users u ON p.authorId = u.id
          WHERE p.status = 'pending'
          ORDER BY p.createdAt ASC
        `);
      }

      if (type === 'comments' || type === 'all') {
        pendingComments = await Database.query(`
          SELECT 
            c.id, c.content, c.isAnonymous, c.createdAt,
            p.title as postTitle,
            CASE 
              WHEN c.isAnonymous = TRUE THEN 'Anonymous' 
              ELSE CONCAT(u.firstName, ' ', u.lastName) 
            END as authorName,
            u.email as authorEmail
          FROM discussion_comments c
          LEFT JOIN discussion_posts p ON c.postId = p.id
          LEFT JOIN users u ON c.authorId = u.id
          WHERE c.status = 'pending'
          ORDER BY c.createdAt ASC
        `);
      }

      // Get reported content
      const reports = await Database.query(`
        SELECT 
          r.id, r.targetType, r.targetId, r.reason, r.description, r.createdAt,
          CONCAT(u.firstName, ' ', u.lastName) as reporterName,
          CASE 
            WHEN r.targetType = 'post' THEN p.title 
            ELSE SUBSTRING(c.content, 1, 100)
          END as contentPreview
        FROM discussion_reports r
        LEFT JOIN users u ON r.reporterId = u.id
        LEFT JOIN discussion_posts p ON r.targetType = 'post' AND r.targetId = p.id
        LEFT JOIN discussion_comments c ON r.targetType = 'comment' AND r.targetId = c.id
        WHERE r.status = 'pending'
        ORDER BY r.createdAt ASC
      `);

      return successResponse({
        pendingPosts,
        pendingComments,
        reports,
        summary: {
          pendingPostsCount: pendingPosts.length,
          pendingCommentsCount: pendingComments.length,
          reportsCount: reports.length
        }
      });

    } catch (error) {
      console.error('Moderation queue error:', error);
      return errorResponse('Failed to fetch moderation queue', 500);
    }
  });
}

// Moderate content
export async function POST(request: NextRequest) {
  return withAdmin(request, async (req: NextRequest, user: any) => {
    try {
      const body = await request.json();
      const { action, type, id, moderationNote } = body;

      if (!['approve', 'reject', 'flag'].includes(action)) {
        return errorResponse('Invalid action', 400);
      }

      if (!['post', 'comment'].includes(type)) {
        return errorResponse('Invalid content type', 400);
      }

      const table = type === 'post' ? 'discussion_posts' : 'discussion_comments';
      const status = action === 'approve' ? 'approved' : 
                     action === 'reject' ? 'rejected' : 'flagged';

      await Database.query(
        `UPDATE ${table} SET status = ?, moderatedBy = ?, moderatedAt = NOW(), moderationNote = ? WHERE id = ?`,
        [status, user.id, moderationNote || null, id]
      );

      return successResponse({
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${action}ed successfully`
      });

    } catch (error) {
      console.error('Moderate content error:', error);
      return errorResponse('Failed to moderate content', 500);
    }
  });
}
