// Admin dashboard endpoint - GET /api/admin/dashboard
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
      // Get overall statistics
      const [totalUsers] = await Database.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
      const [totalAdmins] = await Database.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      const [totalEmergencyReports] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports');
      const [totalComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints');
      
      // Get pending items
      const [pendingEmergencies] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports WHERE status = "pending"');
      const [pendingComplaints] = await Database.query('SELECT COUNT(*) as count FROM complaints WHERE status = "pending"');
      const [criticalEmergencies] = await Database.query('SELECT COUNT(*) as count FROM emergency_reports WHERE priority = "critical" AND status != "resolved"');

      // Get recent activity (last 24 hours)
      const [recentEmergencies] = await Database.query(
        `SELECT COUNT(*) as count FROM emergency_reports 
         WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      );

      const [recentComplaints] = await Database.query(
        `SELECT COUNT(*) as count FROM complaints 
         WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      );

      // Get recent reports for quick access
      const latestEmergencies = await Database.query(
        `SELECT 
          er.id, er.title, er.category, er.location, 
          er.status, er.priority, er.createdAt,
          u.firstName, u.lastName, u.studentId
         FROM emergency_reports er
         LEFT JOIN users u ON er.userId = u.id
         ORDER BY er.createdAt DESC
         LIMIT 5`
      );

      const latestComplaints = await Database.query(
        `SELECT 
          c.id, c.title, c.category, 
          c.status, c.priority, c.createdAt,
          u.firstName, u.lastName, u.studentId
         FROM complaints c
         LEFT JOIN users u ON c.userId = u.id
         ORDER BY c.createdAt DESC
         LIMIT 5`
      );

      // Get monthly trends (last 6 months)
      const monthlyEmergencies = await Database.query(`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          COUNT(*) as count
        FROM emergency_reports
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month DESC
      `);

      const monthlyComplaints = await Database.query(`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          COUNT(*) as count
        FROM complaints
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month DESC
      `);

      // Get verification requests
      const [pendingVerifications] = await Database.query(
        'SELECT COUNT(*) as count FROM users WHERE isVerified = FALSE AND role = "student"'
      );

      // Process latest reports
      const processedEmergencies = latestEmergencies.map(report => ({
        ...report,
        reporterName: report.firstName && report.lastName 
          ? `${report.firstName} ${report.lastName}` 
          : 'Anonymous'
      }));

      const processedComplaints = latestComplaints.map(complaint => ({
        ...complaint,
        reporterName: complaint.firstName && complaint.lastName 
          ? `${complaint.firstName} ${complaint.lastName}` 
          : 'Anonymous'
      }));

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
