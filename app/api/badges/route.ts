export const dynamic = 'force-dynamic';

// Safety badges API - /api/badges
//
// Reading requires a session; awarding is administrator-only. Before this
// guard existed any caller could grant themselves arbitrary badges and
// points, which made the leaderboard meaningless.
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  requireAuth,
  requireAdmin,
  canActOnRecord,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { parseBody, awardBadgeSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    if (!requestedUserId) {
      const badges = await Database.query(
        'SELECT * FROM safety_badges WHERE isActive = TRUE ORDER BY points DESC'
      );

      return successResponse(badges);
    }

    const parsedId = Number(requestedUserId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return errorResponse('Invalid userId', 400);
    }

    // A student may only read their own badge record.
    if (!canActOnRecord(auth.user, parsedId)) {
      return errorResponse('Access denied', 403);
    }

    const [userBadges, userPoints] = await Promise.all([
      Database.query(
        `SELECT sb.*, ub.awardedAt
         FROM user_badges ub
         JOIN safety_badges sb ON ub.badgeId = sb.id
         WHERE ub.userId = ? AND sb.isActive = TRUE
         ORDER BY ub.awardedAt DESC`,
        [parsedId]
      ),
      Database.query('SELECT points FROM user_points WHERE userId = ?', [parsedId]),
    ]);

    return successResponse({
      badges: userBadges,
      points: userPoints[0]?.points || 0,
    });
  } catch (error) {
    return serverErrorResponse('Error fetching badges', error, 'Failed to fetch badges');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const parsed = await parseBody(request, awardBadgeSchema);
    if (!parsed.ok) return parsed.response;

    const { userId, badgeId, points } = parsed.data;

    const recipient = await Database.query('SELECT id FROM users WHERE id = ?', [userId]);

    if (recipient.length === 0) {
      return errorResponse('Recipient not found', 404);
    }

    if (badgeId) {
      const badge = await Database.query(
        'SELECT id FROM safety_badges WHERE id = ? AND isActive = TRUE',
        [badgeId]
      );

      if (badge.length === 0) {
        return errorResponse('Badge not found', 404);
      }
    }

    await Database.transaction(async (connection) => {
      if (badgeId) {
        await connection.execute('INSERT IGNORE INTO user_badges (userId, badgeId) VALUES (?, ?)', [
          userId,
          badgeId,
        ]);
      }

      if (points) {
        await connection.execute(
          `INSERT INTO user_points (userId, points) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE points = points + ?`,
          [userId, points, points]
        );
      }
    });

    await logAction(
      auth.user.id,
      'AWARD_BADGE',
      'user_badges',
      userId,
      { recipientId: userId, badgeId, points },
      request
    );

    return successResponse({ userId, badgeId, points }, 'Badge or points awarded');
  } catch (error) {
    return serverErrorResponse(
      'Error awarding badge/points',
      error,
      'Failed to award badge or points'
    );
  }
}
