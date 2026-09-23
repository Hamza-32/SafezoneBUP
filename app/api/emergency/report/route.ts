export const dynamic = 'force-dynamic';

// Emergency report endpoint - POST /api/emergency/report
//
// Submissions are accepted without a session on purpose: someone in danger
// must not be blocked by a login screen. The rate limit is deliberately
// loose for the same reason, and only exists to stop automated flooding.
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { deliverAlert, loadResponderRecipients } from '@/lib/notify';
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

  const user = await optionalUser(request);

  // Ten per ten minutes keyed on the client address was the wrong shape for
  // this endpoint specifically. A campus shares egress addresses, so the
  // limit pooled every student behind one counter — and the moment it would
  // bind is a fire or an evacuation, when many people report the same thing
  // at once. The eleventh person to report a real emergency was told to slow
  // down.
  //
  // The costs are not symmetric. A handful of spam reports wastes a
  // responder's minute; one refused genuine report can cost far more. So the
  // limit is kept, because an open endpoint would be abused, but shaped so
  // it binds on an individual rather than on a building:
  //
  //   signed in  -> per account, since one person does not need more
  //   anonymous  -> per address, with a ceiling high enough for a whole
  //                 building to report at once and low enough to stop a
  //                 script
  const limited = user
    ? await enforceRateLimit(request, 'emergency-report-user', 10, 10 * 60, String(user.id))
    : await enforceRateLimit(request, 'emergency-report-ip', 100, 10 * 60);

  if (limited) return limited;

  try {

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
        Boolean(isAnonymous),
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
 * Record the report for every responder, and push it to them.
 *
 * The in-app row is the record; the email is what makes somebody look at it,
 * since a dashboard nobody has open notifies nobody. Delivery is best effort
 * and is skipped entirely when no provider is configured — see lib/notify.ts.
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

    // Awaited rather than fired and forgotten: a serverless function can be
    // frozen the moment its response is returned, which would cut off an
    // in-flight request. lib/notify caps this at four seconds and never
    // throws.
    const recipients = await loadResponderRecipients(Database.query.bind(Database));
    const delivery = await deliverAlert(recipients, {
      severity: 'emergency',
      subject: `Emergency reported: ${report.category} at ${report.location}`,
      lines: [
        `A ${report.priority} priority ${report.category} emergency has been reported.`,
        `Location: ${report.location}`,
        'Open the SafezoneBUP dashboard to take ownership of this report.',
      ],
      reference: report.referenceId,
    });

    if (delivery.sent > 0) {
      console.log(
        `Emergency ${report.referenceId} delivered to ${delivery.sent} responder(s).`
      );
    }
  } catch (error) {
    // The report is already stored. A notification failure must not turn a
    // successful submission into an error for the person reporting.
    console.error(`Failed to notify responders of report ${report.referenceId}:`, error);
  }
}
