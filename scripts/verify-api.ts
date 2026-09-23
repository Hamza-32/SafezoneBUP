/**
 * End-to-end checks against a running server and a real database.
 *
 *   1. npm run dev          (in another terminal)
 *   2. npm run db:migrate
 *   3. npm run verify:api
 *
 * These are the checks that cannot run without a database: privilege
 * escalation, cross-user access, the SOS latch, and the three schema fixes
 * that anonymous reporting depends on.
 *
 * The script creates two throwaway student accounts and removes them, along
 * with everything they created, when it finishes. It refuses to run against
 * a non-local server unless given --yes, because it writes real rows.
 *
 * Options:
 *   --url=http://localhost:3000   server to test
 *   --keep                        leave the test data in place
 *   --yes                         allow a non-local target
 */

import dotenv from 'dotenv';

// .env.local is loaded first on purpose. dotenv never overwrites a variable
// that is already set, so whichever file is read first wins. Loading .env
// first meant a stale value there silently beat the real one in .env.local,
// which is the opposite of how Next.js itself resolves them.
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

import crypto from 'crypto';
import { Database } from '../lib/database';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(description: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${description}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${description}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(name: string): void {
  console.log(`\n${name}`);
}

const args = process.argv.slice(2);

function argValue(name: string, fallback: string): string {
  const match = args.find((arg) => arg.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : fallback;
}

const baseUrl = argValue('url', 'http://localhost:3000').replace(/\/$/, '');
const keepData = args.includes('--keep');
const confirmed = args.includes('--yes');

/** A session is just the cookie the server set at login. */
interface Session {
  cookie: string | null;
}

interface Result {
  status: number;
  body: any;
  /** Just the name=value pair, for resending. */
  setCookie: string | null;
  /** The full header including its attributes, for inspection. */
  rawSetCookie: string | null;
}

async function call(
  method: string,
  path: string,
  options: { body?: unknown; session?: Session } = {}
): Promise<Result> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.session?.cookie) {
    headers.Cookie = options.session.cookie;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let body: any = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  const raw = response.headers.get('set-cookie');
  // Keep just the name=value pair for resending, and the full header so the
  // cookie attributes can be asserted.
  const setCookie = raw ? raw.split(';')[0] : null;

  return { status: response.status, body, setCookie, rawSetCookie: raw };
}

// ---------------------------------------------------------------------------

const runId = crypto.randomBytes(4).toString('hex');
const testEmails: string[] = [];

function newAccount(label: string) {
  const email = `verify-${runId}-${label}@example.invalid`;
  testEmails.push(email);

  return {
    firstName: 'Verify',
    lastName: label,
    email,
    password: 'VerifyRun9Pass',
  };
}

async function cleanup(): Promise<void> {
  if (testEmails.length === 0) return;

  const placeholders = testEmails.map(() => '?').join(', ');
  const users = await Database.query(
    `SELECT id FROM users WHERE email IN (${placeholders})`,
    testEmails
  );

  const ids = users.map((user: { id: number }) => user.id);

  if (ids.length === 0) return;

  const idPlaceholders = ids.map(() => '?').join(', ');

  // Anonymous reports have no owner, so they are matched on the run id that
  // this script puts in every title it creates. Matching on the EMG- prefix
  // instead would delete every real report in the table.
  const runTag = `verify-${runId}%`;

  await Database.query('DELETE FROM emergency_reports WHERE title LIKE ?', [runTag]).catch(
    () => undefined
  );
  await Database.query('DELETE FROM complaints WHERE title LIKE ?', [runTag]).catch(
    () => undefined
  );
  await Database.query('DELETE FROM discussion_posts WHERE title LIKE ?', [runTag]).catch(
    () => undefined
  );

  await Database.query(`DELETE FROM safety_checkins WHERE userId IN (${idPlaceholders})`, ids);
  await Database.query(`DELETE FROM lost_and_found WHERE userId IN (${idPlaceholders})`, ids).catch(
    () => undefined
  );
  await Database.query(
    `DELETE FROM notifications WHERE userId IN (${idPlaceholders})`,
    ids
  ).catch(() => undefined);
  await Database.query(`DELETE FROM audit_logs WHERE userId IN (${idPlaceholders})`, ids).catch(
    () => undefined
  );
  await Database.query(`DELETE FROM users WHERE id IN (${idPlaceholders})`, ids);

  console.log(`\nRemoved ${ids.length} test account(s) and their data.`);
}

async function main(): Promise<void> {
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseUrl);

  if (!isLocal && !confirmed) {
    console.error(`❌ Refusing to write test data to ${baseUrl} without --yes`);
    process.exit(1);
  }

  console.log(`Testing ${baseUrl}`);

  // -------------------------------------------------------------------------
  section('Server is reachable and the database is connected');

  const health = await call('GET', '/api/health').catch(() => null);

  if (!health) {
    console.error(`\n❌ Could not reach ${baseUrl}. Start the server first (npm run dev).`);
    process.exit(1);
  }

  check('health endpoint responds', health.status === 200 || health.status === 503);

  if (health.status !== 200) {
    console.error('\n❌ The server is up but the database is not connected.');
    console.error('   Fix the DB_* variables and run npm run db:migrate, then retry.');
    process.exit(1);
  }

  check('health does not leak a database error message', !JSON.stringify(health.body).includes('ECONNREFUSED'));

  // -------------------------------------------------------------------------
  section('Registration cannot grant privileges');

  const alice = newAccount('alice');

  const registered = await call('POST', '/api/auth/register', {
    body: { ...alice, role: 'admin' },
  });

  check('registration succeeds', registered.status === 201, `status ${registered.status}`);
  check(
    'a requested admin role is ignored',
    registered.body?.data?.user?.role === 'student',
    `got role ${registered.body?.data?.user?.role}`
  );
  check('registration sets a session cookie', Boolean(registered.setCookie));
  check(
    'the cookie is the expected session cookie',
    (registered.setCookie || '').startsWith('safezone-token=')
  );
  check(
    'the session cookie is httpOnly, so script cannot read it',
    /httponly/i.test(registered.rawSetCookie || ''),
    registered.rawSetCookie || 'no Set-Cookie header'
  );
  check(
    'the session cookie is SameSite=Lax',
    /samesite=lax/i.test(registered.rawSetCookie || ''),
    registered.rawSetCookie || 'no Set-Cookie header'
  );

  const weak = await call('POST', '/api/auth/register', {
    body: { ...newAccount('weak'), password: 'short' },
  });

  check('a weak password is rejected', weak.status === 400, `status ${weak.status}`);

  // -------------------------------------------------------------------------
  section('Login');

  const login = await call('POST', '/api/auth/login', {
    body: { email: alice.email, password: alice.password },
  });

  check('login succeeds', login.status === 200, `status ${login.status}`);

  const aliceSession: Session = { cookie: login.setCookie };

  check('login returns the user', login.body?.data?.user?.email === alice.email);

  const badLogin = await call('POST', '/api/auth/login', {
    body: { email: alice.email, password: 'WrongPassword9' },
  });

  check('a wrong password is rejected', badLogin.status === 401);
  check(
    'the rejection does not say whether the account exists',
    badLogin.body?.error === 'Invalid credentials'
  );

  // -------------------------------------------------------------------------
  section('Check-ins are scoped to the session');

  const anonCheckins = await call('GET', '/api/checkin');
  check('reading check-ins without a session is refused', anonCheckins.status === 401);

  const ownCheckins = await call('GET', '/api/checkin', { session: aliceSession });
  check('reading own check-ins works', ownCheckins.status === 200, `status ${ownCheckins.status}`);

  const created = await call('POST', '/api/checkin', {
    session: aliceSession,
    body: {
      // Injected on purpose: the server must ignore it.
      userId: 1,
      expectedArrivalTime: new Date(Date.now() + 3600_000).toISOString(),
      location: `verify-${runId} route`,
      notes: 'created by npm run verify:api',
    },
  });

  check('creating a check-in works', created.status === 201, `status ${created.status}`);

  const checkinId = created.body?.data?.id;
  const aliceId = registered.body?.data?.user?.id;

  check(
    'the check-in belongs to the session user, not the injected id',
    created.body?.data?.userId === aliceId,
    `owner ${created.body?.data?.userId}, expected ${aliceId}`
  );

  // -------------------------------------------------------------------------
  section('Another user cannot touch it');

  const bob = newAccount('bob');
  const bobRegistered = await call('POST', '/api/auth/register', { body: bob });
  const bobSession: Session = { cookie: bobRegistered.setCookie };

  check('second account created', bobRegistered.status === 201);

  const steal = await call('GET', `/api/checkin?userId=${aliceId}`, { session: bobSession });
  check("reading another user's check-ins is refused", steal.status === 403, `status ${steal.status}`);

  const hijack = await call('PUT', '/api/checkin', {
    session: bobSession,
    body: { id: checkinId, status: 'arrived' },
  });

  check("updating another user's check-in is refused", hijack.status === 403, `status ${hijack.status}`);

  // -------------------------------------------------------------------------
  section('SOS');

  const sos = await call('PUT', '/api/checkin', {
    session: aliceSession,
    body: { id: checkinId, status: 'alerted', sosTriggered: true },
  });

  check('raising an SOS works', sos.status === 200, `status ${sos.status}`);
  check('the SOS flag is set', sos.body?.data?.sosTriggered === true);

  const retract = await call('PUT', '/api/checkin', {
    session: aliceSession,
    body: { id: checkinId, status: 'arrived', sosTriggered: false },
  });

  check('an SOS cannot be retracted once raised', retract.body?.data?.sosTriggered === true);

  if (checkinId) {
    const notifications = await Database.query(
      'SELECT COUNT(*) as count FROM notifications WHERE relatedId = ? AND relatedType = ?',
      [checkinId, 'system']
    );

    const responders = await Database.query(
      "SELECT COUNT(*) as count FROM users WHERE role IN ('admin', 'security')"
    );

    if (responders[0].count === 0) {
      console.log('  skip  responders are notified (no admin or security account exists)');
    } else {
      check(
        'raising an SOS notifies the responders',
        notifications[0].count > 0,
        `${notifications[0].count} notifications for check-in ${checkinId}`
      );
    }
  }

  const badStatus = await call('PUT', '/api/checkin', {
    session: aliceSession,
    body: { id: checkinId, status: 'not-a-status' },
  });

  check('an unknown status is rejected', badStatus.status === 400);

  // -------------------------------------------------------------------------
  section('A student cannot reach administrator endpoints');

  const contacts = await call('POST', '/api/contacts', {
    session: aliceSession,
    body: { name: 'Fake hotline', phoneNumber: '+0000000000' },
  });

  check('editing emergency contacts is refused', contacts.status === 403, `status ${contacts.status}`);

  const setup = await call('POST', '/api/admin/setup-database', { session: aliceSession });
  check('running database setup is refused', setup.status === 403, `status ${setup.status}`);

  const badge = await call('POST', '/api/badges', {
    session: aliceSession,
    body: { userId: aliceId, points: 9999 },
  });

  check('awarding badges is refused', badge.status === 403, `status ${badge.status}`);

  const category = await call('POST', '/api/discussion/categories', {
    session: aliceSession,
    body: { name: `verify-${runId}` },
  });

  check('creating a discussion category is refused', category.status === 403, `status ${category.status}`);

  // -------------------------------------------------------------------------
  section('Anonymous reporting works (needs migration 001)');

  const anonReport = await call('POST', '/api/emergency/report', {
    body: {
      title: `verify-${runId} medical`,
      description: 'Submitted by npm run verify:api with no session.',
      category: 'medical',
      location: `verify-${runId} location`,
    },
  });

  check(
    'an emergency report with no session is stored',
    anonReport.status === 201,
    `status ${anonReport.status}: ${JSON.stringify(anonReport.body?.error ?? '')}`
  );

  const referenceId = anonReport.body?.data?.referenceId;
  check('a reference id is returned', typeof referenceId === 'string' && referenceId.length > 0);

  if (referenceId) {
    const stored = await Database.query(
      'SELECT referenceId FROM emergency_reports WHERE referenceId = ?',
      [referenceId]
    );

    check('the reference id is actually stored (needs migration 002)', stored.length === 1);
  }

  const accident = await call('POST', '/api/emergency/report', {
    body: {
      title: `verify-${runId} accident`,
      description: 'Category coverage check.',
      category: 'accident',
      location: `verify-${runId} location`,
    },
  });

  check(
    'the accident category is accepted (needs migration 003)',
    accident.status === 201,
    `status ${accident.status}`
  );

  const anonComplaint = await call('POST', '/api/complaint/report', {
    body: {
      title: `verify-${runId} complaint`,
      description: 'Submitted with no session.',
      category: 'bullying',
    },
  });

  check(
    'a complaint with no session and a widened category is stored (needs migrations 001 and 004)',
    anonComplaint.status === 201,
    `status ${anonComplaint.status}`
  );

  // -------------------------------------------------------------------------
  section('Input validation at the edge');

  const scriptUrl = await call('POST', '/api/lost-and-found', {
    session: aliceSession,
    body: {
      type: 'lost',
      title: 'Validation check',
      description: 'Image URL should be rejected.',
      category: 'keys',
      imageUrl: 'javascript:alert(1)',
    },
  });

  check('a javascript: image URL is rejected', scriptUrl.status === 400, `status ${scriptUrl.status}`);

  const crossOrigin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ email: alice.email, password: alice.password }),
  });

  check('a cross-origin login is refused', crossOrigin.status === 403, `status ${crossOrigin.status}`);

  // -------------------------------------------------------------------------
  // The listing endpoints.
  //
  // These are the screens a reporter and a responder actually read, and all
  // three returned 500 on every call for as long as they have existed: they
  // LEFT JOIN users ON <table>.assignedTo, and that column was in no schema
  // revision until migration 003. Nothing here exercised them, so 39 checks
  // passed against an application whose report lists could not load.
  //
  // A 200 is the assertion. A 500 means the join or the JSONB handling has
  // regressed.
  section('Report listings load');

  const myReports = await call('GET', '/api/emergency/my-reports', { session: aliceSession });
  check(
    'a student can list their own emergency reports',
    myReports.status === 200,
    `status ${myReports.status}`
  );

  const myComplaints = await call('GET', '/api/complaint/reports', { session: aliceSession });
  check(
    'the complaints listing responds without a server error',
    myComplaints.status === 200 || myComplaints.status === 403,
    `status ${myComplaints.status}`
  );

  const staffReports = await call('GET', '/api/emergency/reports', { session: aliceSession });
  check(
    'the staff emergency listing refuses a student rather than failing',
    staffReports.status === 403,
    `status ${staffReports.status}`
  );

  // -------------------------------------------------------------------------
  // The discussion board.
  //
  // Its submit handler used to console.log the post and then tell the author
  // "submitted for moderation". Nothing was stored. The board is for peer
  // support, so the posts being silently dropped were the ones written by
  // someone who needed an answer.
  section('Discussion posts are stored');

  const categories = await call('GET', '/api/discussion/categories', { session: aliceSession });
  const categoryList = categories.body?.data ?? categories.body?.data?.categories ?? [];
  const firstCategory = Array.isArray(categoryList) ? categoryList[0] : null;

  if (!firstCategory) {
    check('a discussion category exists to post into', false, 'no categories returned');
  } else {
    const created = await call('POST', '/api/discussion/posts', {
      session: aliceSession,
      body: {
        title: `verify-${runId} discussion post`,
        content: 'Written by verify:api and removed when the run finishes.',
        categoryId: firstCategory.id,
        isAnonymous: true,
      },
    });

    check('a discussion post is accepted', created.status === 201 || created.status === 200,
      `status ${created.status}`);
    check('the stored post is given an id', Boolean(created.body?.data?.id),
      JSON.stringify(created.body?.data ?? {}).slice(0, 80));
  }

  // -------------------------------------------------------------------------
  // Moderation is not bypassable from the query string.
  //
  // GET /api/discussion/posts took its status straight from the caller, so
  // ?status=pending returned posts held for moderation to anyone at all, and
  // ?status=rejected returned ones a moderator had refused. Withholding
  // unreviewed content is the entire point of moderating an anonymous board.
  section('Unmoderated posts stay private');

  const pendingAnon = await fetch(`${baseUrl}/api/discussion/posts?status=pending`);
  const pendingBody = await pendingAnon.json().catch(() => ({}));
  const anonPosts = pendingBody?.data?.posts ?? [];

  check(
    'an anonymous caller asking for pending posts receives none',
    Array.isArray(anonPosts) && anonPosts.every((post: any) => post.status === 'approved'),
    `${anonPosts.length} post(s), statuses ${[...new Set(anonPosts.map((p: any) => p.status))].join(',')}`
  );

  const rejectedAnon = await fetch(`${baseUrl}/api/discussion/posts?status=rejected`);
  const rejectedBody = await rejectedAnon.json().catch(() => ({}));
  const rejectedPosts = rejectedBody?.data?.posts ?? [];

  check(
    'an anonymous caller asking for rejected posts receives none',
    Array.isArray(rejectedPosts) && rejectedPosts.every((post: any) => post.status === 'approved'),
    `${rejectedPosts.length} post(s)`
  );

  const studentPending = await call('GET', '/api/discussion/posts?status=pending', {
    session: aliceSession,
  });
  const studentPosts = studentPending.body?.data?.posts ?? [];

  check(
    'a signed-in student cannot read the moderation queue either',
    Array.isArray(studentPosts) && studentPosts.every((post: any) => post.status === 'approved'),
    `${studentPosts.length} post(s)`
  );

  // -------------------------------------------------------------------------
  section('Removed endpoints are gone');

  for (const path of ['/api/debug-env', '/api/resources', '/api/discussions']) {
    const gone = await call('GET', path);
    check(`${path} returns 404`, gone.status === 404, `status ${gone.status}`);
  }
}

main()
  .then(async () => {
    if (!keepData) {
      await cleanup().catch((error) => {
        console.error('\n⚠️  Cleanup failed, test data may remain:', error?.message ?? error);
      });
    } else {
      console.log('\nLeaving test data in place (--keep).');
    }

    await Database.closePool();

    console.log('');

    if (failed > 0) {
      console.error(`${failed} of ${passed + failed} checks failed.`);
      process.exit(1);
    }

    console.log(`All ${passed} checks passed.`);
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Run failed:', error?.message ?? error);

    if (!keepData) {
      await cleanup().catch(() => undefined);
    }

    await Database.closePool();
    process.exit(1);
  });
