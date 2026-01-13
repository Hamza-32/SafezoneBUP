import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (userId) {
      // Get user's badges and points
      const [userBadges, userPoints] = await Promise.all([
        Database.query(`
          SELECT sb.*, ub.awardedAt
          FROM user_badges ub
          JOIN safety_badges sb ON ub.badgeId = sb.id
          WHERE ub.userId = ? AND sb.isActive = true
          ORDER BY ub.awardedAt DESC
        `, [userId]),
        Database.query(`
          SELECT points FROM user_points WHERE userId = ?
        `, [userId])
      ]);
      
      return NextResponse.json({ 
        success: true, 
        data: {
          badges: userBadges,
          points: userPoints[0]?.points || 0
        }
      });
    } else {
      // Get all available badges
      const badges = await Database.query(`
        SELECT * FROM safety_badges WHERE isActive = true ORDER BY points DESC
      `);
      
      return NextResponse.json({ success: true, data: badges });
    }
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, badgeId, points } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await Database.transaction(async (connection) => {
      // Award badge if provided
      if (badgeId) {
        await connection.execute(
          `INSERT IGNORE INTO user_badges (userId, badgeId) VALUES (?, ?)`,
          [userId, badgeId]
        );
      }
      
      // Update points if provided
      if (points) {
        await connection.execute(`
          INSERT INTO user_points (userId, points) VALUES (?, ?)
          ON DUPLICATE KEY UPDATE points = points + ?
        `, [userId, points, points]);
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Badge/points awarded successfully'
    });
  } catch (error) {
    console.error('Error awarding badge/points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to award badge/points' },
      { status: 500 }
    );
  }
}
