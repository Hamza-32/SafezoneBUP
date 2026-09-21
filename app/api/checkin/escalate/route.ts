export const dynamic = 'force-dynamic';

// Escalates check-ins whose expected arrival has passed - /api/checkin/escalate
//
// Called by a scheduler, not by the application. See RUNNING.md for wiring one
// up; without it, overdue check-ins are only escalated opportunistically when
// a responder happens to load the dashboard.
//
// Authentication is a shared secret rather than a session, because the caller
// is a machine with no account. Two header forms are accepted: Vercel Cron
// sends `Authorization: Bearer <CRON_SECRET>`, and an external scheduler can
// send `x-escalation-secret` instead.

import { NextRequest } from 'next/server';
import { escalateOverdueCheckins, GRACE_PERIOD_MINUTES } from '@/lib/checkin-escalation';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-middleware';

/**
 * Constant-time comparison, so a caller cannot learn the secret one character
 * at a time from how long the check takes.
 */
function secretsMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;

  let difference = 0;
  for (let i = 0; i < provided.length; i += 1) {
    difference |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return difference === 0;
}

function isAuthorised(request: NextRequest): boolean {
  const expected = process.env.CHECKIN_ESCALATION_SECRET || process.env.CRON_SECRET;

  // Refuse rather than run unauthenticated. An open endpoint here would let
  // anyone force-escalate every pending check-in and bury responders in
  // alerts, which is worse than the endpoint being unavailable.
  if (!expected || expected.length < 16) {
    console.error(
      'CHECKIN_ESCALATION_SECRET is not set, or is shorter than 16 characters. ' +
        'The escalation endpoint refuses every request until it is set. ' +
        'Generate one with: npm run gen:secret'
    );
    return false;
  }

  const bearer = request.headers.get('authorization');
  if (bearer?.startsWith('Bearer ') && secretsMatch(bearer.slice(7), expected)) {
    return true;
  }

  const header = request.headers.get('x-escalation-secret');
  return Boolean(header && secretsMatch(header, expected));
}

async function handle(request: NextRequest) {
  if (!isAuthorised(request)) {
    // Deliberately not distinguishing "no secret configured" from "wrong
    // secret": both are 401 to an unauthenticated caller.
    return errorResponse('Unauthorized', 401);
  }

  try {
    const started = Date.now();
    const result = await escalateOverdueCheckins();

    if (result.escalated > 0) {
      console.warn(
        `Escalated ${result.escalated} overdue check-in(s), notifying ${result.notified} recipient(s).`
      );
    }

    return successResponse(
      {
        ...result,
        gracePeriodMinutes: GRACE_PERIOD_MINUTES,
        durationMs: Date.now() - started,
      },
      result.escalated > 0
        ? `Escalated ${result.escalated} overdue check-in(s)`
        : 'No overdue check-ins'
    );
  } catch (error) {
    return serverErrorResponse('Check-in escalation failed', error, 'Escalation failed');
  }
}

// POST is the correct verb, but Vercel Cron issues GET, so both are accepted.
export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
