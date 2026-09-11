export const dynamic = 'force-dynamic';

// Discussion Post Details API - GET /api/discussion/posts/[id]
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  successResponse,
  errorResponse,
  withAuth
} from '@/lib/api-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;

    // Get post details
    const [post] = await Database.query(`
      SELECT 
        p.id, p.title, p.content, p.isAnonymous, p.status, 
        p.upvotes, p.downvotes, p.createdAt, p.updatedAt,
        c.name as categoryName, c.color as categoryColor,
        CASE 
          WHEN p.isAnonymous = TRUE THEN 'Anonymous' 
          ELSE CONCAT(u.firstName, ' ', u.lastName) 
        END as authorName
      FROM discussion_posts p
      LEFT JOIN discussion_categories c ON p.categoryId = c.id
      LEFT JOIN users u ON p.authorId = u.id
      WHERE p.id = ? AND p.status = 'approved'
    `, [postId]);

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    // Get comments for this post
    const comments = await Database.query(`
      SELECT 
        c.id, c.content, c.parentId, c.upvotes, c.downvotes, 
        c.createdAt, c.updatedAt,
        CASE 
          WHEN c.isAnonymous = TRUE THEN 'Anonymous' 
          ELSE CONCAT(u.firstName, ' ', u.lastName) 
        END as authorName
      FROM discussion_comments c
      LEFT JOIN users u ON c.authorId = u.id
      WHERE c.postId = ? AND c.status = 'approved'
      ORDER BY c.createdAt ASC
    `, [postId]);

    // Organize comments into threads
    const commentMap = new Map();
    const rootComments = [];

    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
      
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return successResponse({
      post,
      comments: rootComments,
      commentCount: comments.length
    });

  } catch (error) {
    console.error('Discussion post details error:', error);
    return errorResponse('Failed to fetch post details', 500);
  }
}

// Vote on a post
// Vote on a post. Sending the same action twice withdraws the vote.
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      const postId = Number(params.id);

      if (!Number.isInteger(postId) || postId <= 0) {
        return errorResponse('Invalid post id', 400);
      }

      const body = await request.json().catch(() => ({}));
      const { action } = body;

      if (action !== 'upvote' && action !== 'downvote') {
        return errorResponse('Invalid action', 400);
      }

      const post = await Database.query('SELECT id FROM discussion_posts WHERE id = ?', [postId]);

      if (post.length === 0) {
        return errorResponse('Post not found', 404);
      }

      // The vote row and the cached counts on the post have to move
      // together. Previously they were separate statements, so a failure
      // between them left the counts permanently out of step with the votes.
      //
      // Column names are written out in full rather than interpolated from
      // `action`, so no request value can ever reach the SQL text.
      const counts = await Database.transaction(async (connection) => {
        const [existing] = (await connection.execute(
          'SELECT voteType FROM discussion_votes WHERE userId = ? AND targetType = "post" AND targetId = ?',
          [user.id, postId]
        )) as any;

        const previous = existing[0]?.voteType;

        if (previous === action) {
          // Same vote again withdraws it.
          await connection.execute(
            'DELETE FROM discussion_votes WHERE userId = ? AND targetType = "post" AND targetId = ?',
            [user.id, postId]
          );

          // GREATEST(0, ...) keeps a count from going negative if the
          // stored totals have already drifted.
          await connection.execute(
            action === 'upvote'
              ? 'UPDATE discussion_posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = ?'
              : 'UPDATE discussion_posts SET downvotes = GREATEST(0, downvotes - 1) WHERE id = ?',
            [postId]
          );
        } else if (previous) {
          // Switching sides moves one count up and the other down.
          await connection.execute(
            'UPDATE discussion_votes SET voteType = ? WHERE userId = ? AND targetType = "post" AND targetId = ?',
            [action, user.id, postId]
          );

          await connection.execute(
            action === 'upvote'
              ? 'UPDATE discussion_posts SET upvotes = upvotes + 1, downvotes = GREATEST(0, downvotes - 1) WHERE id = ?'
              : 'UPDATE discussion_posts SET downvotes = downvotes + 1, upvotes = GREATEST(0, upvotes - 1) WHERE id = ?',
            [postId]
          );
        } else {
          await connection.execute(
            'INSERT INTO discussion_votes (userId, targetType, targetId, voteType) VALUES (?, "post", ?, ?)',
            [user.id, postId, action]
          );

          await connection.execute(
            action === 'upvote'
              ? 'UPDATE discussion_posts SET upvotes = upvotes + 1 WHERE id = ?'
              : 'UPDATE discussion_posts SET downvotes = downvotes + 1 WHERE id = ?',
            [postId]
          );
        }

        const [updated] = (await connection.execute(
          'SELECT upvotes, downvotes FROM discussion_posts WHERE id = ?',
          [postId]
        )) as any;

        return {
          ...updated[0],
          // What this user's vote is now, so the client can render the
          // button state without a second request.
          myVote: previous === action ? null : action,
        };
      });

      return successResponse({
        upvotes: counts?.upvotes ?? 0,
        downvotes: counts?.downvotes ?? 0,
        myVote: counts?.myVote ?? null,
      });
    } catch (error) {
      console.error('Vote post error:', error);
      return errorResponse('Failed to vote on post', 500);
    }
  });
}
