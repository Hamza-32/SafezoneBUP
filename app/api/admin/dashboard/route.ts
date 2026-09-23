export const dynamic = 'force-dynamic';

// Admin dashboard endpoint - GET /api/admin/dashboard
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withStaff,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  return withStaff(request, async (req: NextRequest, user: any) => {
    try {
      // Get overall statistics
      const [totalUsers] = await Database.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
      const [totalAdmins] = await Database.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      const [totalEmergencyReports] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports');
      const [totalComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints');
      
      // Get pending items
      const [pendingEmergencies] = await Database.query("SELECT COUNT(*) as count FROM emergency_reports WHERE status = 'pending'");
      const [pendingComplaints] = await Database.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'pending'");
      const [criticalEmergencies] = await Database.query("SELECT COUNT(*) as count FROM emergency_reports WHERE priority = 'critical' AND status <> 'resolved'");

      // Get recent activity (last 24 hours)
      const [recentEmergencies] = await Database.query(
        `SELECT COUNT(*) as count FROM emergency_reports 
         WHERE createdAt >= NOW() - INTERVAL '24 hours'`
      );

      const [recentComplaints] = await Database.query(
        `SELECT COUNT(*) as count FROM complaints 
         WHERE createdAt >= NOW() - INTERVAL '24 hours'`
      );

      // Get recent reports for quick access
      const latestEmergencies = await Database.query(
        `SELECT
          er.id, er.title, er.category, er.location,
          er.status, er.priority, er.createdAt, er.isAnonymous,
          er.assignedTo, er.adminNotes,
          u.firstName, u.lastName, u.studentId,
          assigned_admin.firstName AS assignedAdminFirstName,
          assigned_admin.lastName  AS assignedAdminLastName
         FROM emergency_reports er
         LEFT JOIN users u ON er.userId = u.id
         LEFT JOIN users assigned_admin ON er.assignedTo = assigned_admin.id
         ORDER BY er.createdAt DESC
         LIMIT 5`
      );

      const latestComplaints = await Database.query(
        `SELECT
          c.id, c.title, c.category,
          c.status, c.priority, c.createdAt, c.isAnonymous,
          u.firstName, u.lastName, u.studentId
         FROM complaints c
         LEFT JOIN users u ON c.userId = u.id
         ORDER BY c.createdAt DESC
         LIMIT 5`
      );

      // Get monthly trends (last 6 months). TO_CHAR is the PostgreSQL
      // equivalent of MySQL's DATE_FORMAT.
      const monthlyEmergencies = await Database.query(`
        SELECT
          TO_CHAR(createdAt, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM emergency_reports
        WHERE createdAt >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(createdAt, 'YYYY-MM')
        ORDER BY month DESC
      `);

      const monthlyComplaints = await Database.query(`
        SELECT
          TO_CHAR(createdAt, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM complaints
        WHERE createdAt >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(createdAt, 'YYYY-MM')
        ORDER BY month DESC
      `);

      // Get verification requests
      const [pendingVerifications] = await Database.query(
        "SELECT COUNT(*) as count FROM users WHERE isVerified = FALSE AND role = 'student'"
      );

      // Process latest reports
      // Identity is withheld for a report submitted anonymously, matching the
      // listing endpoints. This surface was missed when those were fixed, and
      // it is the one a responder actually looks at.
      const present = (row: any) => {
        const anonymous = Boolean(row.isAnonymous);
        const {
          firstName,
          lastName,
          studentId,
          assignedAdminFirstName,
          assignedAdminLastName,
          ...rest
        } = row;

        return {
          ...rest,
          firstName: anonymous ? undefined : firstName,
          lastName: anonymous ? undefined : lastName,
          studentId: anonymous ? undefined : studentId,
          reporterName:
            anonymous || !(firstName && lastName) ? 'Anonymous' : `${firstName} ${lastName}`,
          assignedAdminName:
            assignedAdminFirstName && assignedAdminLastName
              ? `${assignedAdminFirstName} ${assignedAdminLastName}`
              : null,
        };
      };

      const processedEmergencies = latestEmergencies.map(present);
      const processedComplaints = latestComplaints.map(present);

      return successResponse({
        statistics: {
          users: {
            total: totalUsers.count,
            admins: totalAdmins.count,
            pendingVerifications: pendingVerifications.count
          },
          reports: {
            emergencies: {
              total: totalEmergencyReports.count,
              pending: pendingEmergencies.count,
              critical: criticalEmergencies.count,
              recent: recentEmergencies.count
            },
            complaints: {
              total: totalComplaints.count,
              pending: pendingComplaints.count,
              recent: recentComplaints.count
            }
          }
        },
        recentActivity: {
          emergencies: processedEmergencies,
          complaints: processedComplaints
        },
        trends: {
          emergencies: monthlyEmergencies,
          complaints: monthlyComplaints
        }
      });

    } catch (error) {
      console.error('Admin dashboard error:', error);
      return errorResponse('Failed to load dashboard data', 500);
    }
  });
}
