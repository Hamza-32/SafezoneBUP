/**
 * Checks the security rules that are easy to break by accident.
 *
 * Runs with no database and no test framework:
 *   npm run verify:security
 *
 * These are guard rails, not a substitute for a real test suite. Everything
 * asserted here is a rule that was actually violated at some point in this
 * codebase, so a failure means a regression rather than a style question.
 */

import {
  registerSchema,
  adminCreateUserSchema,
  createCheckinSchema,
  updateCheckinSchema,
  createLostFoundSchema,
  createEmergencyReportSchema,
  createComplaintSchema,
  passwordSchema,
  safeUrlSchema,
} from '../lib/validation';
import { canActOnRecord, type AuthenticatedUser } from '../lib/api-middleware';
import { rateLimit, resetRateLimits } from '../lib/rate-limit';

let failures = 0;
let checks = 0;

function check(description: string, condition: boolean, detail?: string): void {
  checks += 1;

  if (condition) {
    console.log(`  ok    ${description}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${description}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(name: string): void {
  console.log(`\n${name}`);
}

// ---------------------------------------------------------------------------

section('Self-registration cannot choose a role');
{
  const parsed = registerSchema.safeParse({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@bup.edu.bd',
    password: 'CorrectHorse9',
    role: 'admin',
  });

  check('a submitted role is stripped from the parsed body', parsed.success && !('role' in parsed.data));

  const adminParsed = adminCreateUserSchema.safeParse({
    firstName: 'Test',
    lastName: 'Staff',
    email: 'staff@bup.edu.bd',
    password: 'CorrectHorse9',
    role: 'security',
  });

  check('the admin schema does keep a valid role', adminParsed.success && adminParsed.data.role === 'security');

  check(
    'the admin schema rejects an unknown role',
    !adminCreateUserSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'CorrectHorse9',
      role: 'superuser',
    }).success
  );
}

section('Password policy');
{
  check('rejects a short password', !passwordSchema.safeParse('Short1').success);
  check('rejects an all-lowercase password', !passwordSchema.safeParse('alllowercase').success);
  check('rejects a password with no digit', !passwordSchema.safeParse('NoDigitsHere').success);
  check('accepts a compliant password', passwordSchema.safeParse('CorrectHorse9').success);
}

section('Client-supplied ownership is not accepted');
{
  const checkin = createCheckinSchema.safeParse({
    userId: 999,
    expectedArrivalTime: '2026-09-11T22:30:00Z',
    location: 'Library to Hall 3',
  });

  check('check-in body cannot carry a userId', checkin.success && !('userId' in checkin.data));

  const item = createLostFoundSchema.safeParse({
    userId: 999,
    type: 'lost',
    title: 'Bag',
    description: 'Black laptop bag',
    category: 'accessories',
  });

  check('lost and found body cannot carry a userId', item.success && !('userId' in item.data));

  const update = updateCheckinSchema.safeParse({ id: 1, status: 'arrived', resolvedBy: 5 });

  check('check-in update cannot carry resolvedBy', update.success && !('resolvedBy' in update.data));
}

section('Status and category values are constrained');
{
  check(
    'check-in status must be a known value',
    !updateCheckinSchema.safeParse({ id: 1, status: 'whatever' }).success
  );

  check(
    'every category offered by the emergency form is accepted',
    ['medical', 'fire', 'security', 'accident', 'violence', 'other'].every(
      (category) =>
        createEmergencyReportSchema.safeParse({
          title: 'T',
          description: 'D',
          category,
          location: 'L',
        }).success
    )
  );

  check(
    'an unknown emergency category is rejected',
    !createEmergencyReportSchema.safeParse({
      title: 'T',
      description: 'D',
      category: 'nuclear',
      location: 'L',
    }).success
  );

  check(
    'every category offered by the complaint form is accepted',
    [
      'facility',
      'service',
      'academic',
      'harassment',
      'bullying',
      'discrimination',
      'misconduct',
      'property',
      'noise',
      'other',
    ].every(
      (category) =>
        createComplaintSchema.safeParse({ title: 'T', description: 'D', category }).success
    )
  );
}

section('Image and attachment URLs cannot carry script');
{
  check('rejects a javascript: URL', !safeUrlSchema.safeParse('javascript:alert(1)').success);
  check('rejects a data: URL', !safeUrlSchema.safeParse('data:text/html,<script>').success);
  check('rejects a protocol-relative URL', !safeUrlSchema.safeParse('//evil.example/x.png').success);
  check('accepts an https URL', safeUrlSchema.safeParse('https://example.com/x.png').success);
  check('accepts a relative path', safeUrlSchema.safeParse('/uploads/x.png').success);
}

section('Record ownership');
{
  const student: AuthenticatedUser = {
    id: 7,
    email: 's@bup.edu.bd',
    firstName: 'S',
    lastName: 'T',
    studentId: 'BUP1',
    phoneNumber: null,
    role: 'student',
    isVerified: true,
  };

  const staff: AuthenticatedUser = { ...student, id: 8, role: 'security' };

  check('a student may act on their own record', canActOnRecord(student, 7));
  check('a student may not act on another record', !canActOnRecord(student, 9));
  check('a student may not act on an ownerless record', !canActOnRecord(student, null));
  check('staff may act on any record', canActOnRecord(staff, 9) && canActOnRecord(staff, null));
}

section('Rate limiter');
{
  resetRateLimits();

  const results = Array.from({ length: 6 }, () => rateLimit('test-bucket', 5, 60));

  check('allows requests up to the limit', results.slice(0, 5).every((r) => r.allowed));
  check('blocks the request past the limit', !results[5].allowed);
  check('reports a retry delay when blocked', results[5].retryAfterSeconds > 0);

  const other = rateLimit('different-bucket', 5, 60);
  check('counts each key separately', other.allowed);

  resetRateLimits();
  check('reset clears the counters', rateLimit('test-bucket', 5, 60).allowed);
}

// ---------------------------------------------------------------------------
// Column name casing.
//
// PostgreSQL lower-cases unquoted identifiers, so the data layer maps
// returned keys back to the casing the application reads. A camelCase column
// or alias that is missing from that map arrives lower-cased and every read
// of it is undefined, with no error. This check makes that impossible to
// miss by scanning the schema and the SELECT aliases for names the map does
// not cover.
// ---------------------------------------------------------------------------

async function checkColumnCaseMap(): Promise<void> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { COLUMN_CASE_MAP } = await import('../lib/database-columns');

  section('Column name casing is fully mapped');

  const root = path.resolve(__dirname, '..');
  const sources = [
    'lib/database-setup.ts',
    'lib/database-migrate.ts',
    ...(await collectRouteFiles(fs, path, path.join(root, 'app/api'))),
  ];

  const missing = new Set<string>();

  for (const relative of sources) {
    const file = path.isAbsolute(relative) ? relative : path.join(root, relative);
    const text = await fs.readFile(file, 'utf8');

    // Column definitions in the schema: a camelCase name at the start of a
    // line followed by a type.
    for (const match of text.matchAll(
      /^\s{2,}([a-z]+[A-Z]\w*)\s+(?:SERIAL|INTEGER|INT\b|TEXT|VARCHAR|BOOLEAN|TIMESTAMPTZ|TIMESTAMP|DATE|JSONB|NUMERIC)/gm
    )) {
      if (COLUMN_CASE_MAP[match[1].toLowerCase()] === undefined) missing.add(match[1]);
    }

    // Aliases introduced by a SELECT, which come back lower-cased too.
    for (const match of text.matchAll(/\bas\s+([a-z]+[A-Z]\w*)\b/g)) {
      if (COLUMN_CASE_MAP[match[1].toLowerCase()] === undefined) missing.add(match[1]);
    }
  }

  check(
    'every camelCase column and alias is in the casing map',
    missing.size === 0,
    missing.size > 0 ? `missing: ${[...missing].sort().join(', ')}` : undefined
  );
}

async function collectRouteFiles(fs: any, path: any, dir: string): Promise<string[]> {
  const found: string[] = [];

  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      found.push(...(await collectRouteFiles(fs, path, full)));
    } else if (entry.name === 'route.ts') {
      found.push(full);
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// Placeholder translation. Every statement in the project is written with
// MySQL's `?` and translated to PostgreSQL's `$n` in the data layer, so a
// mistake here would corrupt every query in the application.
// ---------------------------------------------------------------------------

async function checkPlaceholderTranslation(): Promise<void> {
  const { toPositionalParams } = await import('../lib/database');

  section('Placeholder translation');

  check(
    'numbers placeholders in order',
    toPositionalParams('INSERT INTO t (a, b, c) VALUES (?, ?, ?)') ===
      'INSERT INTO t (a, b, c) VALUES ($1, $2, $3)'
  );

  check(
    'leaves a question mark inside a string literal alone',
    toPositionalParams("SELECT * FROM t WHERE label = 'why?' AND id = ?") ===
      "SELECT * FROM t WHERE label = 'why?' AND id = $1"
  );

  check(
    'handles an escaped quote inside a literal',
    toPositionalParams("SELECT * FROM t WHERE name = 'it''s ok?' AND id = ?") ===
      "SELECT * FROM t WHERE name = 'it''s ok?' AND id = $1"
  );

  check(
    'leaves a question mark in a line comment alone',
    toPositionalParams('SELECT 1 -- really?\nWHERE id = ?') ===
      'SELECT 1 -- really?\nWHERE id = $2'.replace('$2', '$1')
  );

  check(
    'leaves a dollar-quoted body alone',
    toPositionalParams("CREATE FUNCTION f() AS $$ BEGIN RETURN 'a?'; END; $$ LANGUAGE plpgsql") ===
      "CREATE FUNCTION f() AS $$ BEGIN RETURN 'a?'; END; $$ LANGUAGE plpgsql"
  );

  check(
    'does not renumber an already-translated statement',
    toPositionalParams('SELECT * FROM t WHERE id = $1') === 'SELECT * FROM t WHERE id = $1'
  );
}

// ---------------------------------------------------------------------------
// The shared rate-limit backend, exercised against a stub of the Redis REST
// protocol. This is the riskiest new code path, because it sits in front of
// login and has to fail open to the in-memory counters rather than reject.
// ---------------------------------------------------------------------------

async function checkSharedRateLimiter(): Promise<void> {
  const http = await import('node:http');
  const { NextRequest } = await import('next/server');

  // Minimal stand-in for the pipeline endpoint: SET .. NX, INCR, TTL.
  const store = new Map<string, number>();
  let requestCount = 0;

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      requestCount += 1;

      const commands = JSON.parse(body) as string[][];
      const results = commands.map((command) => {
        const [name, key] = command;

        if (name === 'SET') {
          if (store.has(key)) return { result: null };
          store.set(key, 0);
          return { result: 'OK' };
        }

        if (name === 'INCR') {
          const next = (store.get(key) ?? 0) + 1;
          store.set(key, next);
          return { result: next };
        }

        if (name === 'TTL') {
          return { result: 60 };
        }

        return { error: `unexpected command ${name}` };
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;

  const { enforceRateLimit, isSharedRateLimitEnabled } = await import('../lib/rate-limit');

  process.env.RATE_LIMIT_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.RATE_LIMIT_REDIS_REST_TOKEN = 'stub-token';

  const request = new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.7' },
  });

  section('Shared rate-limit backend');

  check('the shared backend is detected from the environment', isSharedRateLimitEnabled());

  const outcomes: Array<Response | null> = [];
  for (let i = 0; i < 4; i += 1) {
    outcomes.push(await enforceRateLimit(request, 'stub', 3, 60));
  }

  check('requests within the limit are allowed', outcomes.slice(0, 3).every((r) => r === null));
  check('the request past the limit is blocked', outcomes[3] !== null);
  check('the block is a 429', outcomes[3]?.status === 429);
  check(
    'the block carries a Retry-After header',
    Number(outcomes[3]?.headers.get('Retry-After')) > 0
  );
  check('the shared store was actually used', requestCount === 4);

  // With the endpoint gone, the limiter must fall back rather than throw or
  // start rejecting every request.
  await new Promise<void>((resolve) => server.close(() => resolve()));

  const afterOutage = await enforceRateLimit(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.8' },
    }),
    'stub-outage',
    3,
    60
  );

  check('an unreachable store falls back instead of failing the request', afterOutage === null);

  delete process.env.RATE_LIMIT_REDIS_REST_URL;
  delete process.env.RATE_LIMIT_REDIS_REST_TOKEN;

  check('removing the variables disables the shared backend', !isSharedRateLimitEnabled());
}

// ---------------------------------------------------------------------------

checkColumnCaseMap()
  .then(checkPlaceholderTranslation)
  .then(checkSharedRateLimiter)
  .catch((error) => {
    failures += 1;
    console.error(`  FAIL  asynchronous checks threw: ${error?.message ?? error}`);
  })
  .then(() => {
    console.log('');

    if (failures > 0) {
      console.error(`${failures} of ${checks} checks failed.`);
      process.exit(1);
    }

    console.log(`All ${checks} checks passed.`);
    process.exit(0);
  });
