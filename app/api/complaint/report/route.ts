export const dynamic = 'force-dynamic';

// Create complaint endpoint - POST /api/complaint/report
//
// Like emergency reports, this accepts anonymous submissions so someone can
// report harassment without first creating an account.
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  optionalUser,
  assertSameOrigin,
  generateReferenceId,
  logAction,
  successResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { enforceRateLimit } from '@/lib/rate-limit';
import { parseBody, createComplaintSchema } from '@/lib/validation';

// Categories escalated to high priority on submission.
const HIGH_PRIORITY_CATEGORIES = new Set([
  'harassment',
  'bullying',
  'discrimination',
  'misconduct',
]);

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = await enforceRateLimit(request, 'complaint-report', 10, 10 * 60);
  if (limited) return limited;

  try {
    const user = await optionalUser(request);

    const parsed = await parseBody(request, createComplaintSchema);
    if (!parsed.ok) return parsed.response;

    const { title, description, category, location, priority, isAnonymous, attachments } =
      parsed.data;

    const referenceId = generateReferenceId('CPL');

    // Previously this used a substring match, so any category containing
    // "facility" or "security" was escalated. It is now an exact lookup.
    const finalPriority = HIGH_PRIORITY_CATEGORIES.has(category) ? 'high' : priority || 'medium';

    const result = await Database.query(
      `INSERT INTO complaints
       (referenceId, userId, title, description, category, location, priority, isAnonymous, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        referenceId,
        user?.id ?? null,
        title,
        description,
        category,
        location || null,
        finalPriority,
        Boolean(isAnonymous),
        attachments ? JSON.stringify(attachments) : null,
      ]
    );

    const complaintId = result.insertId;

    await notifyAdmins({ complaintId, referenceId, category, title, priority: finalPriority });

    await logAction(
      user?.id ?? null,
      'CREATE_COMPLAINT',
      'complaints',
      complaintId,
      { category, priority: finalPriority, isAnonymous: Boolean(isAnonymous) },
      request
    );

    return successResponse(
      { referenceId, priority: finalPriority, complaintId },
      'Complaint submitted successfully',
      201
    );
  } catch (error) {
    return serverErrorResponse('Complaint submission error', error, 'Failed to submit complaint');
  }
}

async function notifyAdmins(complaint: {
  complaintId: number;
  referenceId: string;
  category: string;
  title: string;
  priority: string;
}): Promise<void> {
  try {
    const admins = await Database.query("SELECT id FROM users WHERE role = 'admin'");

    if (admins.length === 0) return;

    const notificationTitle = `📋 New Complaint - ${complaint.category}`;
    const message =
      `New complaint titled "${complaint.title}" has been submitted. ` +
      `Priority: ${complaint.priority.toUpperCase()}. Reference: ${complaint.referenceId}`;

    // One statement instead of a query per administrator.
    const placeholders = admins.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values = admins.flatMap((admin: { id: number }) => [
      admin.id,
      notificationTitle,
      message,
      'warning',
      complaint.complaintId,
      'complaint',
    ]);

    await Database.query(
      `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType)
       VALUES ${placeholders}`,
      values
    );
  } catch (error) {
    console.error(`Failed to notify admins of complaint ${complaint.referenceId}:`, error);
  }
}
