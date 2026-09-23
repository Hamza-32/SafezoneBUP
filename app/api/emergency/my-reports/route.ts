export const dynamic = 'force-dynamic';

// Get user's emergency reports endpoint - GET /api/emergency/my-reports
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withAuth,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

/**
 * Read a JSONB column.
 *
 * node-pg parses jsonb before the row reaches here, so the value is normally
 * already an array or object. A string only appears on the MySQL-era code
 * path that lib/database.ts still supports, so both are tolerated, and a
 * malformed value yields null rather than a 500.
 */
function readJsonColumn(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}


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
        attachments: readJsonColumn(report.attachments),
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
