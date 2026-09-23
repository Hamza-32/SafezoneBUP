export const dynamic = 'force-dynamic';

// Get emergency reports endpoint - GET /api/emergency/reports
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withStaff,
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

/**
 * Strip the reporter's identity from a row they asked to submit anonymously.
 *
 * The form says "Submit anonymously — your identity will be protected", and
 * this endpoint used to build reporterName from the joined user row whatever
 * the flag said, while `SELECT er.*` carried userId and the join added
 * firstName, lastName and studentId. The one audience the promise is made
 * against — staff — received the reporter's name, student id and user id.
 *
 * Anonymity is withheld here rather than hidden in the interface, the same
 * way the lost-and-found board does it, so a client cannot opt out of it.
 */
function presentReport(row: any) {
  const anonymous = Boolean(row.isAnonymous);

  const {
    firstName,
    lastName,
    studentId,
    userId,
    assignedAdminFirstName,
    assignedAdminLastName,
    ...rest
  } = row;

  return {
    ...rest,
    // Kept for a named reporter so staff can follow up, dropped entirely for
    // an anonymous one.
    userId: anonymous ? undefined : userId,
    firstName: anonymous ? undefined : firstName,
    lastName: anonymous ? undefined : lastName,
    studentId: anonymous ? undefined : studentId,
    attachments: readJsonColumn(row.attachments),
    reporterName:
      anonymous || !(firstName && lastName) ? 'Anonymous' : `${firstName} ${lastName}`,
    assignedAdminName:
      assignedAdminFirstName && assignedAdminLastName
        ? `${assignedAdminFirstName} ${assignedAdminLastName}`
        : null,
  };
}


export async function GET(request: NextRequest) {
  return withStaff(request, async (req: NextRequest, user: any) => {
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
      const processedReports = reports.map(presentReport);

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
