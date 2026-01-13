// Create complaint endpoint - POST /api/complaint/report
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { 
  withOptionalAuth,
  validateRequiredFields, 
  sanitizeInput, 
  generateReferenceId,
  logAction,
  successResponse,
  errorResponse
} from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  return withOptionalAuth(request, async (req: NextRequest, user: any) => {
    try {
      const body = await request.json();
      const {
        title,
        description,
        category,
        location,
        priority,
        isAnonymous,
        attachments
      } = sanitizeInput(body);

      // Validate required fields
      const requiredFields = ['title', 'description', 'category'];
      const missing = validateRequiredFields({ title, description, category }, requiredFields);
      
      if (missing.length > 0) {
        return errorResponse('Missing required fields', 400, { missing });
      }

      // Generate reference ID
      const referenceId = generateReferenceId('CPL');

      // Determine priority based on category if not provided
      let finalPriority = priority || 'medium';
      const highPriorityCategories = ['harassment', 'facility', 'security'];
      if (highPriorityCategories.some(cat => category.toLowerCase().includes(cat.toLowerCase()))) {
        finalPriority = 'high';
      }

      // Create complaint
      const result = await Database.query(
        `INSERT INTO complaints 
         (userId, title, description, category, location, priority, isAnonymous, attachments) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user?.id || null,
          title,
          description,
          category,
          location || null,
          finalPriority,
          isAnonymous || false,
          attachments ? JSON.stringify(attachments) : null
        ]
      );

      const complaintId = result.insertId;

      // Create notifications for admins
      const admins = await Database.query('SELECT id FROM users WHERE role = "admin"');
      
      for (const admin of admins) {
        await Database.query(
          `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            admin.id,
            `📋 New Complaint - ${category}`,
            `New complaint titled "${title}" has been submitted. Priority: ${finalPriority.toUpperCase()}. Reference: ${referenceId}`,
            'warning',
            complaintId,
            'complaint'
          ]
        );
      }

      // Log action
      if (user) {
        await logAction(user.id, 'CREATE_COMPLAINT', 'complaints', complaintId, { 
          category, 
          priority: finalPriority,
          isAnonymous 
        }, request);
      }

      return successResponse({
        referenceId,
        priority: finalPriority,
        complaintId
      }, 'Complaint submitted successfully', 201);

    } catch (error) {
      console.error('Complaint submission error:', error);
      return errorResponse('Failed to submit complaint', 500);
    }
  });
}
