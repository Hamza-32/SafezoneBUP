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
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      const postId = params.id;
      const body = await request.json();
      const { action } = body; // 'upvote' or 'downvote'

      if (!['upvote', 'downvote'].includes(action)) {
        return errorResponse('Invalid action', 400);
      }

      // Check if user already voted
      const [existingVote] = await Database.query(
        'SELECT voteType FROM discussion_votes WHERE userId = ? AND targetType = "post" AND targetId = ?',
        [user.id, postId]
      );

      if (existingVote) {
        if (existingVote.voteType === action) {
          // Remove vote if same action
          await Database.query(
            'DELETE FROM discussion_votes WHERE userId = ? AND targetType = "post" AND targetId = ?',
            [user.id, postId]
          );
          
          // Update post count
          const field = action === 'upvote' ? 'upvotes' : 'downvotes';
          await Database.query(
            `UPDATE discussion_posts SET ${field} = ${field} - 1 WHERE id = ?`,
            [postId]
          );
        } else {
          // Change vote
          await Database.query(
            'UPDATE discussion_votes SET voteType = ? WHERE userId = ? AND targetType = "post" AND targetId = ?',
            [action, user.id, postId]
          );
          
          // Update post counts
          const increaseField = action === 'upvote' ? 'upvotes' : 'downvotes';
          const decreaseField = action === 'upvote' ? 'downvotes' : 'upvotes';
          await Database.query(
            `UPDATE discussion_posts SET ${increaseField} = ${increaseField} + 1, ${decreaseField} = ${decreaseField} - 1 WHERE id = ?`,
            [postId]
          );
        }
      } else {
        // Add new vote
        await Database.query(
          'INSERT INTO discussion_votes (userId, targetType, targetId, voteType) VALUES (?, "post", ?, ?)',
          [user.id, postId, action]
        );
        
        // Update post count
        const field = action === 'upvote' ? 'upvotes' : 'downvotes';
        await Database.query(
          `UPDATE discussion_posts SET ${field} = ${field} + 1 WHERE id = ?`,
          [postId]
        );
      }

      // Get updated vote counts
      const [updatedPost] = await Database.query(
        'SELECT upvotes, downvotes FROM discussion_posts WHERE id = ?',
        [postId]
      );

      return successResponse({
        upvotes: updatedPost.upvotes,
        downvotes: updatedPost.downvotes
      });

    } catch (error) {
      console.error('Vote post error:', error);
      return errorResponse('Failed to vote on post', 500);
    }
  });
}
