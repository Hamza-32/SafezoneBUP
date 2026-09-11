export const dynamic = 'force-dynamic';

// Emergency report endpoint - POST /api/emergency/report
//
// Submissions are accepted without a session on purpose: someone in danger
// must not be blocked by a login screen. The rate limit is deliberately
// loose for the same reason, and only exists to stop automated flooding.
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
import { parseBody, createEmergencyReportSchema } from '@/lib/validation';

// Categories that are always treated as critical regardless of what the
// reporter selected for priority.
const CRITICAL_CATEGORIES = new Set(['medical', 'fire', 'security', 'violence']);

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const limited = await enforceRateLimit(request, 'emergency-report', 10, 10 * 60);
  if (limited) return limited;

  try {
    const user = await optionalUser(request);

    const parsed = await parseBody(request, createEmergencyReportSchema);
    if (!parsed.ok) return parsed.response;

    const {
      title,
      description,
      category,
      location,
      latitude,
      longitude,
      priority,
      isAnonymous,
      attachments,
    } = parsed.data;

    const referenceId = generateReferenceId('EMG');

    const finalPriority = CRITICAL_CATEGORIES.has(category) ? 'critical' : priority || 'medium';

    const result = await Database.query(
      `INSERT INTO emergency_reports
       (referenceId, userId, title, description, category, location, latitude, longitude,
        priority, isAnonymous, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        referenceId,
        user?.id ?? null,
        title,
        description,
        category,
        location,
        latitude ?? null,
        longitude ?? null,
        finalPriority,
        isAnonymous ? 1 : 0,
        attachments ? JSON.stringify(attachments) : null,
      ]
    );

    const reportId = result.insertId;

    await notifyResponders({ reportId, referenceId, category, location, priority: finalPriority });

    await logAction(
      user?.id ?? null,
      'CREATE_EMERGENCY_REPORT',
      'emergency_reports',
      reportId,
      { category, priority: finalPriority, isAnonymous: Boolean(isAnonymous) },
      request
    );

    return successResponse(
      { referenceId, priority: finalPriority, reportId },
      'Emergency report submitted successfully',
      201
    );
  } catch (error) {
    return serverErrorResponse(
      'Emergency report error',
      error,
      'Failed to submit emergency report'
    );
  }
}

/**
 * Raise an in-app notification for every responder.
 *
 * This is in-app only. Nothing here sends a text message, an email or a push
 * notification, so a report is seen when a responder next opens the
 * dashboard. Connecting this to an external alerting channel is the main
 * outstanding requirement before this is relied on in a real emergency.
 */
async function notifyResponders(report: {
  reportId: number;
  referenceId: string;
  category: string;
  location: string;
  priority: string;
}): Promise<void> {
  try {
    const responders = await Database.query(
      "SELECT id FROM users WHERE role IN ('admin', 'security')"
    );

    if (responders.length === 0) {
      console.warn(
        `Emergency report ${report.referenceId} has no admin or security account to notify.`
      );
      return;
    }

    const title = `🚨 New Emergency Report - ${report.category}`;
    const message =
      `Emergency reported at ${report.location}. ` +
      `Priority: ${report.priority.toUpperCase()}. Reference: ${report.referenceId}`;

    // One statement instead of a query per responder.
    const placeholders = responders.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values = responders.flatMap((responder: { id: number }) => [
      responder.id,
      title,
      message,
      'error',
      report.reportId,
      'emergency',
    ]);

    await Database.query(
      `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType)
       VALUES ${placeholders}`,
      values
    );
  } catch (error) {
    // The report is already stored. A notification failure must not turn a
    // successful submission into an error for the person reporting.
    console.error(`Failed to notify responders of report ${report.referenceId}:`, error);
  }
}
