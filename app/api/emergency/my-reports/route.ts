// Get user's emergency reports endpoint - GET /api/emergency/my-reports
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withAuth,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    try {
      const reports = await Database.query(
        `SELECT 
          er.*,
          assigned_admin.firstName as assignedAdminFirstName,
          assigned_admin.lastName as assignedAdminLastName
         FROM emergency_reports er
         LEFT JOIN users assigned_admin ON er.assignedTo = assigned_admin.id
         WHERE er.userId = ?
         ORDER BY er.createdAt DESC`,
        [user.id]
      );

      // Process reports
      const processedReports = reports.map(report => ({
        ...report,
        attachments: report.attachments ? JSON.parse(report.attachments) : null,
        assignedAdminName: report.assignedAdminFirstName && report.assignedAdminLastName
          ? `${report.assignedAdminFirstName} ${report.assignedAdminLastName}`
          : null
      }));

      return successResponse({ reports: processedReports });

    } catch (error) {
      console.error('Get user emergency reports error:', error);
      return errorResponse('Failed to get your emergency reports', 500);
    }
  });
}
