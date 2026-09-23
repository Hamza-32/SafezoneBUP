export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { successResponse, errorResponse } from '@/lib/api-middleware';
import { isAlertDeliveryEnabled } from '@/lib/notify';
import { isSharedRateLimitEnabled } from '@/lib/rate-limit';
import { isErrorReportingEnabled } from '@/lib/observability';

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const startTime = Date.now();
    await Database.query('SELECT 1 as health_check');
    const dbResponseTime = Date.now() - startTime;

    // Get basic server info
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const uptimeSeconds = Math.floor(uptime % 60);

    // The database being reachable is not the same as the application being
    // able to do its job. This endpoint reported "healthy" for weeks while
    // no alert could leave the building, because nothing checked whether a
    // delivery provider was configured. A health check that cannot fail is
    // worse than no health check: it actively reassures.
    //
    // Two lists, not one. The distinction is whether a person relying on this
    // application is worse off:
    //
    //   degraded — a promise the interface makes is not being kept. An
    //              emergency will not reach a responder; rate limits are not
    //              actually shared; a missed check-in is not escalated.
    //   notes    — something an operator should know that costs a user
    //              nothing. Absent error collection is the example: every
    //              feature behaves identically with or without it.
    //
    // Flattening them would mean an unconfigured Sentry reads the same as
    // undeliverable emergency alerts, and then neither gets taken seriously.
    const degraded: string[] = [];
    const notes: string[] = [];

    if (!isAlertDeliveryEnabled()) {
      degraded.push(
        'Alert delivery is not configured (RESEND_API_KEY). Reports are recorded ' +
          'but no email is sent, so a responder only sees them on the dashboard.'
      );
    }

    if (!isSharedRateLimitEnabled()) {
      degraded.push(
        'Rate limits are counted per instance (no Redis REST endpoint). On a ' +
          'serverless host they reset on cold starts and are not shared.'
      );
    }

    if (!process.env.CHECKIN_ESCALATION_SECRET && !process.env.CRON_SECRET) {
      degraded.push(
        'Check-in escalation cannot be triggered by a scheduler ' +
          '(CHECKIN_ESCALATION_SECRET). An unconfirmed check-in is only escalated ' +
          'when a responder loads the dashboard.'
      );
    }

    if (!isErrorReportingEnabled()) {
      notes.push(
        'Errors are logged but not collected (SENTRY_DSN). Every feature works ' +
          'the same; a failure is just harder to investigate afterwards.'
      );
    }

    return successResponse({
      status: degraded.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`
      },
      degraded,
      notes,
      uptime: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth/*',
        emergency: '/api/emergency/*',
        complaint: '/api/complaint/*',
        admin: '/api/admin/*'
      }
    }, degraded.length === 0
      ? 'API is healthy'
      : `API is running with ${degraded.length} degraded capability(ies)`);

  } catch (error) {
    // The underlying error is logged but never returned: a database error
    // message names hosts, users and table structure.
    console.error('Health check failed:', error);

    return errorResponse('API is unhealthy', 503, {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected'
      }
    });
  }
}
