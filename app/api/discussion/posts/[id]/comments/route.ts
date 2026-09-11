export const dynamic = 'force-dynamic';

// Discussion Comments API - POST /api/discussion/posts/[id]/comments
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  successResponse,
  errorResponse,
  withAuth
} from '@/lib/api-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      const postId = params.id;
      const body = await request.json();
      const { content, parentId = null, isAnonymous = true } = body;

      if (!content || content.trim().length === 0) {
        return errorResponse('Comment content is required', 400);
      }

      // Verify post exists
      const [post] = await Database.query(
        'SELECT id FROM discussion_posts WHERE id = ? AND status = "approved"',
        [postId]
      );

      if (!post) {
        return errorResponse('Post not found', 404);
      }

      // If parentId is provided, verify parent comment exists
      if (parentId) {
        const [parentComment] = await Database.query(
          'SELECT id FROM discussion_comments WHERE id = ? AND postId = ?',
          [parentId, postId]
        );

        if (!parentComment) {
          return errorResponse('Parent comment not found', 404);
        }
      }

      // Get category moderation settings
      const [category] = await Database.query(`
        SELECT c.requiresModeration 
        FROM discussion_categories c
        JOIN discussion_posts p ON c.id = p.categoryId
        WHERE p.id = ?
      `, [postId]);

      const status = category?.requiresModeration ? 'pending' : 'approved';

      // Insert comment
      const result = await Database.query(
        `INSERT INTO discussion_comments 
         (postId, parentId, content, authorId, isAnonymous, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [postId, parentId, content, user.id, isAnonymous, status]
      );

      return successResponse({
        id: result.insertId,
        status,
        message: status === 'pending' 
          ? 'Comment submitted for moderation' 
          : 'Comment added successfully'
      });

    } catch (error) {
      console.error('Create comment error:', error);
      return errorResponse('Failed to add comment', 500);
    }
  });
}
