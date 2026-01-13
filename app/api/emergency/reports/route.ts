// Get emergency reports endpoint - GET /api/emergency/reports
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
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      
      let query = `
        SELECT 
          er.*,
          u.firstName,
          u.lastName,
          u.studentId,
          assigned_admin.firstName as assignedAdminFirstName,
          assigned_admin.lastName as assignedAdminLastName
        FROM emergency_reports er
        LEFT JOIN users u ON er.userId = u.id
        LEFT JOIN users assigned_admin ON er.assignedTo = assigned_admin.id
      `;
      
      const conditions = [];
      const params = [];

      if (status) {
        conditions.push('er.status = ?');
        params.push(status);
      }

      if (priority) {
        conditions.push('er.priority = ?');
        params.push(priority);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY er.createdAt DESC';

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const reports = await Database.query(query, params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM emergency_reports er';
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }

      const [{ total }] = await Database.query(countQuery, params.slice(0, -2));

      // Process reports
      const processedReports = reports.map(report => ({
        ...report,
        attachments: report.attachments ? JSON.parse(report.attachments) : null,
        reporterName: report.firstName && report.lastName 
          ? `${report.firstName} ${report.lastName}` 
          : 'Anonymous',
        assignedAdminName: report.assignedAdminFirstName && report.assignedAdminLastName
          ? `${report.assignedAdminFirstName} ${report.assignedAdminLastName}`
          : null
      }));

      return successResponse({
        reports: processedReports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get emergency reports error:', error);
      return errorResponse('Failed to get emergency reports', 500);
    }
  });
}
