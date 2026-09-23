// Escalation for check-ins whose expected arrival time has passed.
//
// The check-in feature's premise is that if you say where you are going and
// when you expect to arrive, somebody is told when you do not. The schema has
// always had a 'missed' status for this, but nothing ever set it: a check-in
// that was never confirmed sat at 'pending' indefinitely and no responder was
// ever notified. The promise was in the interface and the database, and only
// the part that acts on it was absent.
//
// This module is the missing part. It is deliberately callable from more than
// one place, because a free hosting plan does not give a scheduler with the
// granularity this needs:
//
//   - POST /api/checkin/escalate, for an external scheduler (see RUNNING.md).
//   - A sweep when a responder loads the dashboard, so a deployment with no
//     scheduler at all still escalates, late rather than never.

import { Database } from './database';
import { deliverAlert, loadResponderRecipients } from './notify';

/**
 * How long after the expected arrival time to wait before escalating.
 *
 * Someone who is ten minutes late is usually just late. Escalating instantly
 * would train responders to ignore these, which costs more than the delay.
 */
export const GRACE_PERIOD_MINUTES = 15;

export interface EscalationResult {
  examined: number;
  escalated: number;
  notified: number;
}

interface OverdueCheckin {
  id: number;
  status: string;
  userId: number;
  location: string | null;
  expectedArrivalTime: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
}

/**
 * Find check-ins that are past due, mark them missed and notify responders.
 *
 * Safe to call concurrently: the UPDATE only matches rows still in 'pending',
 * so two callers racing cannot both escalate the same check-in, and the row
 * count tells us which one won.
 */
export async function escalateOverdueCheckins(): Promise<EscalationResult> {
  // Two cases, not one.
  //
  //   pending and overdue           — a check-in nobody has escalated yet
  //   missed with no notifiedAt     — escalation claimed the row and then
  //                                   died before telling anyone
  //
  // The second only exists because claiming and notifying cannot be one
  // atomic step across a database and an email provider. Without it, a
  // serverless function frozen between the two leaves a student recorded as
  // overdue with no responder aware of it, and every later sweep skips the
  // row because it is no longer pending.
  const overdue: OverdueCheckin[] = await Database.query(
    `SELECT c.id, c.userId, c.location, c.expectedArrivalTime, c.status,
            u.firstName, u.lastName, u.phoneNumber
       FROM safety_checkins c
       JOIN users u ON u.id = c.userId
      WHERE c.expectedArrivalTime IS NOT NULL
        AND c.expectedArrivalTime < NOW() - (? || ' minutes')::interval
        AND (
          c.status = 'pending'
          OR (c.status = 'missed' AND c.notifiedAt IS NULL)
        )
      ORDER BY c.expectedArrivalTime ASC
      LIMIT 100`,
    [String(GRACE_PERIOD_MINUTES)]
  );

  if (overdue.length === 0) {
    return { examined: 0, escalated: 0, notified: 0 };
  }

  const responders = await Database.query(
    "SELECT id FROM users WHERE role IN ('admin', 'security')"
  );
  const recipients = await loadResponderRecipients(Database.query.bind(Database));

  let escalated = 0;
  let notified = 0;
  const pushed: string[] = [];

  for (const checkin of overdue) {
    // Claim the row first. If another caller got there first this updates
    // nothing, and we skip it rather than sending a duplicate alert.
    if (checkin.status === 'pending') {
      const claim = await Database.query(
        `UPDATE safety_checkins
            SET status = 'missed', updatedAt = NOW()
          WHERE id = ? AND status = 'pending'`,
        [checkin.id]
      );

      // Another worker got there first. It owns the notification too.
      if (!claim.affectedRows) continue;
      escalated += 1;
    }
    // Otherwise this row is already 'missed' and was picked up because
    // notifiedAt is null — a previous pass claimed it and never finished.
    // It is not counted again; only the notification is retried.

    if (responders.length === 0) {
      console.warn(
        `Check-in ${checkin.id} is overdue but there is no admin or security account to notify.`
      );
      continue;
    }

    const name =
      checkin.firstName || checkin.lastName
        ? `${checkin.firstName ?? ''} ${checkin.lastName ?? ''}`.trim()
        : 'A student';
    const phone = checkin.phoneNumber ? ` Phone: ${checkin.phoneNumber}.` : '';
    const due = new Date(checkin.expectedArrivalTime).toISOString().replace('T', ' ').slice(0, 16);

    const title = '⚠️ Safety check-in was not confirmed';
    const message =
      `${name} did not confirm arrival. Expected by ${due} UTC at ` +
      `${checkin.location || 'an unrecorded destination'}.${phone} ` +
      `Check-in reference: ${checkin.id}.`;

    try {
      await Promise.all(
        responders.map((responder: { id: number }) =>
          Database.query(
            `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType)
             VALUES (?, ?, ?, 'warning', ?, 'system')`,
            [responder.id, title, message, checkin.id]
          )
        )
      );
      // Only now is this check-in fully escalated. Until notifiedAt is set,
      // the next sweep will pick it up again and retry.
      await Database.query(
        'UPDATE safety_checkins SET notifiedAt = NOW() WHERE id = ?',
        [checkin.id]
      );

      notified += responders.length;
      pushed.push(`${name} (check-in ${checkin.id})`);
    } catch (error) {
      // The status change stands even if the notification insert fails; the
      // check-in is visibly 'missed' on the dashboard either way.
      console.error(`Failed to notify responders about check-in ${checkin.id}:`, error);
    }
  }

  // One email covering the whole pass rather than one per check-in. A sweep
  // that finds several overdue at once is usually an outage catching up, and
  // a burst of separate mails would be read as noise.
  if (pushed.length > 0) {
    await deliverAlert(recipients, {
      severity: 'warning',
      subject:
        pushed.length === 1
          ? 'A safety check-in was not confirmed'
          : `${pushed.length} safety check-ins were not confirmed`,
      lines: [
        'The following people set an expected arrival time and did not confirm ' +
          'arriving:',
        ...pushed,
        'Open the SafezoneBUP dashboard for their destination and contact details.',
      ],
    });
  }

  return { examined: overdue.length, escalated, notified };
}

// ---------------------------------------------------------------------------
// Opportunistic sweep
// ---------------------------------------------------------------------------

const SWEEP_INTERVAL_MS = 5 * 60_000;

let lastSweepAt = 0;
let sweepInFlight: Promise<EscalationResult> | null = null;

/**
 * Run an escalation pass at most once every few minutes per instance.
 *
 * This exists so a deployment with no scheduler configured still escalates
 * eventually. It is a safety net, not the mechanism: it only runs while
 * somebody is using the application, and an overnight check-in is exactly
 * the case where nobody is. Configure a real scheduler.
 *
 * Never throws, and never blocks the caller's own response.
 */
export function sweepOverdueCheckins(): void {
  const now = Date.now();
  if (sweepInFlight || now - lastSweepAt < SWEEP_INTERVAL_MS) return;

  lastSweepAt = now;
  sweepInFlight = escalateOverdueCheckins()
    .then((result) => {
      if (result.escalated > 0) {
        console.warn(
          `Opportunistic sweep escalated ${result.escalated} overdue check-in(s). ` +
            'Configure a scheduler so this does not depend on someone being online.'
        );
      }
      return result;
    })
    .catch((error) => {
      console.error('Opportunistic check-in sweep failed:', error);
      return { examined: 0, escalated: 0, notified: 0 };
    })
    .finally(() => {
      sweepInFlight = null;
    }) as Promise<EscalationResult>;
}

/** Resets the sweep throttle. Intended for tests only. */
export function resetCheckinSweep(): void {
  lastSweepAt = 0;
  sweepInFlight = null;
}
