// Emergency report endpoint - POST /api/emergency/report
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
        latitude,
        longitude,
        priority,
        isAnonymous,
        attachments
      } = sanitizeInput(body);

      // Validate required fields
      const requiredFields = ['title', 'description', 'category', 'location'];
      const missing = validateRequiredFields({ title, description, category, location }, requiredFields);
      
      if (missing.length > 0) {
        return errorResponse('Missing required fields', 400, { missing });
      }

      // Generate reference ID
      const referenceId = generateReferenceId('EMG');

      // Determine priority based on category if not provided
      let finalPriority = priority || 'medium';
      const criticalCategories = ['medical', 'fire', 'security'];
      if (criticalCategories.includes(category.toLowerCase())) {
        finalPriority = 'critical';
      }

      // Create emergency report
      const result = await Database.query(
        `INSERT INTO emergency_reports 
         (userId, title, description, category, location, latitude, longitude, 
          priority, isAnonymous, attachments) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user?.id || null,
          title,
          description,
          category,
          location,
          latitude || null,
          longitude || null,
          finalPriority,
          isAnonymous || false,
          attachments ? JSON.stringify(attachments) : null
        ]
      );

      const reportId = result.insertId;

      // Create notifications for admins
      const admins = await Database.query('SELECT id FROM users WHERE role = "admin"');
      
      for (const admin of admins) {
        await Database.query(
          `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            admin.id,
            `🚨 New Emergency Report - ${category}`,
            `Emergency reported at ${location}. Priority: ${finalPriority.toUpperCase()}. Reference: ${referenceId}`,
            'error',
            reportId,
            'emergency'
          ]
        );
      }

      // Log action
      if (user) {
        await logAction(user.id, 'CREATE_EMERGENCY_REPORT', 'emergency_reports', reportId, { 
          category, 
          priority: finalPriority,
          isAnonymous 
        }, request);
      }

      return successResponse({
        referenceId,
        priority: finalPriority,
        reportId
      }, 'Emergency report submitted successfully', 201);

    } catch (error) {
      console.error('Emergency report error:', error);
      return errorResponse('Failed to submit emergency report', 500);
    }
  });
}
