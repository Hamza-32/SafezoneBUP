// Get complaints endpoint - GET /api/complaint/reports
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
      const category = searchParams.get('category');
      const priority = searchParams.get('priority');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      
      let query = `
        SELECT 
          c.*,
          u.firstName,
          u.lastName,
          u.studentId,
          assigned_admin.firstName as assignedAdminFirstName,
          assigned_admin.lastName as assignedAdminLastName
        FROM complaints c
        LEFT JOIN users u ON c.userId = u.id
        LEFT JOIN users assigned_admin ON c.assignedTo = assigned_admin.id
      `;
      
      const conditions = [];
      const params = [];

      if (status) {
        conditions.push('c.status = ?');
        params.push(status);
      }

      if (category) {
        conditions.push('c.category = ?');
        params.push(category);
      }

      if (priority) {
        conditions.push('c.priority = ?');
        params.push(priority);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY c.createdAt DESC';

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const complaints = await Database.query(query, params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM complaints c';
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }

      const [{ total }] = await Database.query(countQuery, params.slice(0, -2));

      // Process complaints
      const processedComplaints = complaints.map(complaint => ({
        ...complaint,
        attachments: complaint.attachments ? JSON.parse(complaint.attachments) : null,
        reporterName: complaint.firstName && complaint.lastName 
          ? `${complaint.firstName} ${complaint.lastName}` 
          : 'Anonymous',
        assignedAdminName: complaint.assignedAdminFirstName && complaint.assignedAdminLastName
          ? `${complaint.assignedAdminFirstName} ${complaint.assignedAdminLastName}`
          : null
      }));

      return successResponse({
        complaints: processedComplaints,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get complaints error:', error);
      return errorResponse('Failed to get complaints', 500);
    }
  });
}
