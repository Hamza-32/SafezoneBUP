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
    // These are reported as degraded rather than unhealthy. Each one has a
    // deliberate fallback and the application still accepts reports without
    // it, so returning 503 would be wrong — but so is staying silent.
    const degraded: string[] = [];

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

    if (!isErrorReportingEnabled()) {
      degraded.push(
        'Errors are logged but not collected (SENTRY_DSN). A failure in ' +
          'production is only visible to whoever reads the logs.'
      );
    }

    if (!process.env.CHECKIN_ESCALATION_SECRET && !process.env.CRON_SECRET) {
      degraded.push(
        'Check-in escalation cannot be triggered by a scheduler ' +
          '(CHECKIN_ESCALATION_SECRET). An unconfirmed check-in is only escalated ' +
          'when a responder loads the dashboard.'
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
      uptime: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth/*',
        emergency: '/api/emergency/*',
        complaint: '/api/complaint/*',
        admin: '/api/admin/*'
      }
    }, degraded.length === 0 ? 'API is healthy' : `API is running with ${degraded.length} degraded capability(ies)`);

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
