export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import { successResponse, errorResponse } from '@/lib/api-middleware';

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

    return successResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`
      },
      uptime: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth/*',
        emergency: '/api/emergency/*',
        complaint: '/api/complaint/*',
        admin: '/api/admin/*'
      }
    }, 'API is healthy');

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
