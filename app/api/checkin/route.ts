export const dynamic = 'force-dynamic';

// Safety check-in API - /api/checkin
//
// A check-in records where someone is going and when they expect to arrive,
// so an SOS or a missed arrival can be escalated. Every handler here is
// scoped to the signed-in user: the caller never supplies a userId.
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  requireAuth,
  canActOnRecord,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { enforceRateLimit } from '@/lib/rate-limit';
import { parseBody, createCheckinSchema, updateCheckinSchema } from '@/lib/validation';
import { sweepOverdueCheckins } from '@/lib/checkin-escalation';

const MAX_CHECKINS_RETURNED = 50;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // Safety net for a deployment with no scheduler wired up. Throttled to one
  // pass every few minutes per instance, does not block this response, and
  // never throws. The scheduled endpoint is the real mechanism; this only
  // narrows the window in which an overdue check-in goes unnoticed.
  sweepOverdueCheckins();

  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // A student always reads their own check-ins. Staff may look up another
    // user's, which is what makes an escalation possible.
    let targetUserId = auth.user.id;

    if (requestedUserId) {
      const parsedId = Number(requestedUserId);

      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return errorResponse('Invalid userId', 400);
      }

      if (!canActOnRecord(auth.user, parsedId)) {
        return errorResponse('Access denied', 403);
      }

      targetUserId = parsedId;
    }

    const checkins = await Database.query(
      `SELECT sc.*, ec.name as emergencyContactName
       FROM safety_checkins sc
       LEFT JOIN emergency_contacts ec ON sc.emergencyContactId = ec.id
       WHERE sc.userId = ?
       ORDER BY sc.createdAt DESC
       LIMIT ${MAX_CHECKINS_RETURNED}`,
      [targetUserId]
    );

    return successResponse(checkins);
  } catch (error) {
    return serverErrorResponse(
      'Error fetching safety checkins',
      error,
      'Failed to fetch safety checkins'
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const limited = await enforceRateLimit(request, 'checkin-create', 20, 60 * 60);
  if (limited) return limited;

  try {
    const parsed = await parseBody(request, createCheckinSchema);
    if (!parsed.ok) return parsed.response;

    const { expectedArrivalTime, location, emergencyContactId, notes } = parsed.data;

    // Reject a contact id that does not exist or is disabled, rather than
    // letting the foreign key fail as an opaque 500.
    if (emergencyContactId) {
      const contact = await Database.query(
        'SELECT id FROM emergency_contacts WHERE id = ? AND isActive = TRUE',
        [emergencyContactId]
      );

      if (contact.length === 0) {
        return errorResponse('Selected emergency contact is not available', 400);
      }
    }

    const result = await Database.query(
      `INSERT INTO safety_checkins (userId, expectedArrivalTime, location, emergencyContactId, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [auth.user.id, expectedArrivalTime, location, emergencyContactId || null, notes || null]
    );

    await logAction(
      auth.user.id,
      'CREATE_CHECKIN',
      'safety_checkins',
      result.insertId,
      { location },
      request
    );

    return successResponse(
      {
        id: result.insertId,
        userId: auth.user.id,
        expectedArrivalTime,
        location,
        emergencyContactId: emergencyContactId || null,
        notes: notes || null,
        status: 'pending',
      },
      'Safety check-in created',
      201
    );
  } catch (error) {
    return serverErrorResponse(
      'Error creating safety checkin',
      error,
      'Failed to create safety checkin'
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // Deliberately generous: a real emergency may involve repeated attempts.
  // The limit only stops automated flooding.
  const limited = await enforceRateLimit(request, 'checkin-update', 60, 15 * 60);
  if (limited) return limited;

  try {
    const parsed = await parseBody(request, updateCheckinSchema);
    if (!parsed.ok) return parsed.response;

    const { id, status, sosTriggered } = parsed.data;

    // Load the record first so ownership can be checked. Without this, any
    // signed-in user could cancel or escalate somebody else's check-in.
    const existing = await Database.query(
      'SELECT id, userId, status, sosTriggered, location FROM safety_checkins WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return errorResponse('Check-in not found', 404);
    }

    const checkin = existing[0];

    if (!canActOnRecord(auth.user, checkin.userId)) {
      return errorResponse('Access denied', 403);
    }

    // sosTriggered is a latch: once raised it stays raised, so a later
    // status change cannot quietly retract an alert that was already sent.
    const raiseSos = sosTriggered === true;
    const nextSos = Boolean(checkin.sosTriggered || raiseSos);

    await Database.query(
      'UPDATE safety_checkins SET status = ?, sosTriggered = ?, updatedAt = NOW() WHERE id = ?',
      [status, nextSos, id]
    );

    const isNewSos = raiseSos && !checkin.sosTriggered;

    if (isNewSos) {
      await alertRespondersOfSos(checkin);
    }

    await logAction(
      auth.user.id,
      isNewSos ? 'TRIGGER_CHECKIN_SOS' : 'UPDATE_CHECKIN',
      'safety_checkins',
      id,
      { status, sosTriggered: nextSos },
      request
    );

    return successResponse(
      { id, status, sosTriggered: nextSos },
      isNewSos ? 'SOS alert raised and responders notified' : 'Safety check-in updated'
    );
  } catch (error) {
    return serverErrorResponse(
      'Error updating safety checkin',
      error,
      'Failed to update safety checkin'
    );
  }
}

/**
 * Fan an SOS out to staff as in-app notifications.
 *
 * This is the same delivery path the emergency report endpoint uses. It is
 * in-app only: nothing here sends a text message or an email, so an SOS is
 * seen when a responder next opens the dashboard. Wiring this to an SMS
 * provider is the outstanding piece of work for real deployments.
 */
async function alertRespondersOfSos(checkin: {
  id: number;
  userId: number;
  location: string | null;
}): Promise<void> {
  try {
    const [reporter] = await Database.query(
      'SELECT firstName, lastName, phoneNumber FROM users WHERE id = ?',
      [checkin.userId]
    );

    const responders = await Database.query(
      "SELECT id FROM users WHERE role IN ('admin', 'security')"
    );

    if (responders.length === 0) {
      console.warn(`SOS on check-in ${checkin.id} has no admin or security account to notify.`);
      return;
    }

    const name = reporter ? `${reporter.firstName} ${reporter.lastName}` : 'A student';
    const phone = reporter?.phoneNumber ? ` Phone: ${reporter.phoneNumber}.` : '';
    const title = '🚨 SOS raised from a safety check-in';
    const message =
      `${name} raised an SOS. Last known destination: ${checkin.location || 'not recorded'}.` +
      `${phone} Check-in reference: ${checkin.id}.`;

    // relatedType has no 'checkin' value in the current schema, so these are
    // filed as 'system'. Adding that enum value needs a migration.
    await Promise.all(
      responders.map((responder: { id: number }) =>
        Database.query(
          `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType)
           VALUES (?, ?, ?, 'error', ?, 'system')`,
          [responder.id, title, message, checkin.id]
        )
      )
    );
  } catch (error) {
    // An SOS must still be recorded even if notifying responders fails.
    console.error(`Failed to notify responders of SOS on check-in ${checkin.id}:`, error);
  }
}
