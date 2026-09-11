export const dynamic = 'force-dynamic';

// Database setup API endpoint - POST /api/admin/setup-database
//
// This used to carry its own copy of the safety-feature tables, written in
// MySQL, which was a third definition of a schema that lib/database-setup.ts
// already owns. Those copies drifted apart. It now applies the shared
// definition and the pending migrations, so there is one source of truth.
//
// It no longer inserts sample safety resources or discussion categories.
// Seeding demonstration content is what `npm run db:seed` is for, and an
// endpoint that injects it into a live database is not something an
// administrator should be able to trigger by accident.
import { NextRequest } from 'next/server';
import { createTables } from '@/lib/database-setup';
import { runMigrations } from '@/lib/database-migrate';
import {
  successResponse,
  requireAdmin,
  logAction,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Creating schema is an administrator action. First-time bootstrap, before
  // any admin account exists, is done from the CLI with `npm run db:setup`.
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const limited = await enforceRateLimit(request, 'setup-database', 3, 60 * 60);
  if (limited) return limited;

  try {
    console.log(`Database setup requested by user ${auth.user.id}`);

    // Both are safe to run against a database that is already current.
    await createTables();
    await runMigrations();

    await logAction(auth.user.id, 'SETUP_DATABASE', 'schema_migrations', null, {}, request);

    return successResponse(
      {
        message: 'Schema created and migrations applied',
        note: 'Run `npm run db:seed` from the command line to add sample data.',
      },
      'Database is up to date'
    );
  } catch (error) {
    return serverErrorResponse('Database setup error', error, 'Failed to set up database');
  }
}
