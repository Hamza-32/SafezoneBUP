/**
 * Proves that the configured rate-limit store is real, reachable and shared.
 *
 *   npm run verify:ratelimit
 *
 * The offline checks in verify-security-invariants.ts exercise this code
 * against a local stub, which confirms the protocol but says nothing about
 * whether the credentials in this environment work. That gap is how a
 * deployment ends up silently counting requests per instance: the limiter
 * falls back to memory rather than failing, so nothing breaks visibly.
 *
 * This script closes it by talking to the store named in the environment.
 * It exits non-zero if the store is missing, misconfigured or unreachable,
 * so it can gate a deploy.
 *
 * Options:
 *   --keep    leave the probe keys in place instead of deleting them
 */

import dotenv from 'dotenv';

// .env.local first: dotenv never overwrites an already-set variable, so the
// file read first wins, and Next.js gives .env.local the higher precedence.
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import {
  describeRateLimitBackend,
  enforceRateLimit,
  resetRateLimits,
  resetRateLimitWarnings,
} from '../lib/rate-limit';

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

function fatal(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const keepKeys = process.argv.includes('--keep');

// ---------------------------------------------------------------------------
// Direct access to the store, independent of the limiter
// ---------------------------------------------------------------------------

interface Endpoint {
  url: string;
  token: string;
}

/**
 * Run Redis commands through the REST pipeline and return each result.
 * Throws on a transport error or on any command-level error, so a caller can
 * treat a returned value as genuine.
 */
async function pipeline(endpoint: Endpoint, commands: string[][]): Promise<unknown[]> {
  const response = await fetch(`${endpoint.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${endpoint.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `HTTP ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`
    );
  }

  const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>;

  if (!Array.isArray(payload)) {
    throw new Error('the endpoint did not return a pipeline array');
  }

  const failure = payload.find((entry) => entry?.error);
  if (failure) throw new Error(failure.error as string);

  return payload.map((entry) => entry?.result);
}

// ---------------------------------------------------------------------------

const CLIENT_IP = '198.51.100.42';
const OTHER_IP = '198.51.100.43';

async function main(): Promise<void> {
  console.log('Rate-limit store verification');

  // -- Configuration --------------------------------------------------------

  const backend = describeRateLimitBackend();

  if (backend.kind === 'absent') {
    fatal(
      'No shared rate-limit store is configured, so limits are counted in process memory.\n' +
        'On a serverless host that means they reset on every cold start and are not shared\n' +
        'between instances.\n\n' +
        'Create a Redis store (Upstash has a free tier, or use Vercel KV from the Vercel\n' +
        'dashboard), set both variables in .env.local, then run this again:\n\n' +
        '  KV_REST_API_URL=https://<name>.upstash.io\n' +
        '  KV_REST_API_TOKEN=<the REST token>'
    );
  }

  if (backend.kind === 'invalid') {
    fatal(
      `The rate-limit store is configured but unusable: ${backend.reason}.\n` +
        `Fix the ${backend.source} variables and run this again.`
    );
  }

  section('Configuration');
  check(`a shared store is configured via ${backend.source}`, true);
  console.log(`        ${backend.url}`);

  const endpoint: Endpoint = {
    url: backend.url,
    token: (
      process.env.KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.RATE_LIMIT_REDIS_REST_TOKEN ||
      ''
    ).trim(),
  };

  // -- Reachability ---------------------------------------------------------

  section('Reachability');

  try {
    // The first call pays DNS and the TLS handshake, which is typically an
    // order of magnitude slower than the rest. Reporting that as "the"
    // latency would flag a perfectly healthy store, so it is measured
    // separately: it is what a cold serverless instance pays on its first
    // rate-limited request, while later requests on that instance reuse the
    // socket and see the warm figure.
    const coldStartedAt = Date.now();
    const [pong] = await pipeline(endpoint, [['PING']]);
    const coldMs = Date.now() - coldStartedAt;

    check('the store answers PING', String(pong).toUpperCase() === 'PONG', `got ${String(pong)}`);

    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const startedAt = Date.now();
      await pipeline(endpoint, [['PING']]);
      samples.push(Date.now() - startedAt);
    }

    samples.sort((a, b) => a - b);
    const warmMs = samples[Math.floor(samples.length / 2)];

    console.log(`        first call ${coldMs}ms (DNS and TLS), warm ${warmMs}ms`);

    check(
      'a warm round trip leaves room under the 1500ms limiter timeout',
      warmMs < 400,
      `${warmMs}ms — a store far from the app slows every rate-limited request`
    );

    if (coldMs > 1200) {
      console.warn(
        '        note: the first call is close to the limiter timeout of 1500ms, so a\n' +
          '        cold instance may fall back to memory on its first request. Move the\n' +
          '        store to the region the app is deployed in.'
      );
    }
  } catch (error) {
    fatal(
      `Could not reach the rate-limit store: ${(error as Error).message}\n\n` +
        'The limiter falls back to per-process memory when this happens, so the\n' +
        'application keeps working — but the limits are not shared. Check the URL and\n' +
        'the token, and that the store has not been paused or deleted.'
    );
  }

  // -- Counting through the limiter -----------------------------------------
  //
  // resetRateLimits() runs before every call so nothing can be served from the
  // in-memory counters. Anything that still accumulates had to come back from
  // the store, which is the cross-instance behaviour being checked: each call
  // stands in for a separate serverless instance with empty local state.

  section('Counting through the shared store');

  const probe = `verify-${crypto.randomBytes(6).toString('hex')}`;
  const limit = 3;
  const windowSeconds = 60;

  const request = new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'x-forwarded-for': CLIENT_IP },
  });

  const outcomes: Array<Response | null> = [];

  for (let i = 0; i < limit + 1; i += 1) {
    resetRateLimits();
    resetRateLimitWarnings();
    outcomes.push(await enforceRateLimit(request, probe, limit, windowSeconds));
  }

  check(
    `the first ${limit} requests are allowed`,
    outcomes.slice(0, limit).every((outcome) => outcome === null)
  );
  check(
    'a request past the limit is refused, with the in-memory counters cleared before ' +
      'every call, so the count came from the store',
    outcomes[limit] !== null
  );
  check('the refusal is a 429', outcomes[limit]?.status === 429);

  const retryAfter = Number(outcomes[limit]?.headers.get('Retry-After'));
  check(
    'the refusal carries a usable Retry-After',
    retryAfter > 0 && retryAfter <= windowSeconds,
    `Retry-After is ${outcomes[limit]?.headers.get('Retry-After')}`
  );

  // -- The window is fixed, not sliding -------------------------------------

  section('Window behaviour');

  const probeKey = `ratelimit:${probe}:${CLIENT_IP}`;

  const [ttl] = await pipeline(endpoint, [['TTL', probeKey]]);
  const ttlSeconds = Number(ttl);

  check(
    'the key carries an expiry, so a blocked caller recovers',
    ttlSeconds > 0 && ttlSeconds <= windowSeconds,
    `TTL is ${String(ttl)}`
  );

  // A further request must not push the expiry back, or a caller who keeps
  // retrying would never be let out of the window.
  resetRateLimits();
  await enforceRateLimit(request, probe, limit, windowSeconds);
  const [ttlAfter] = await pipeline(endpoint, [['TTL', probeKey]]);

  check(
    'further requests do not extend the window',
    Number(ttlAfter) <= ttlSeconds,
    `TTL went from ${ttlSeconds} to ${String(ttlAfter)}`
  );

  // -- Isolation ------------------------------------------------------------

  section('Key isolation');

  resetRateLimits();
  const otherBucket = await enforceRateLimit(request, `${probe}-other`, limit, windowSeconds);
  check('a different bucket is counted separately', otherBucket === null);

  resetRateLimits();
  const otherClient = await enforceRateLimit(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': OTHER_IP },
    }),
    probe,
    limit,
    windowSeconds
  );
  check('a different client address is counted separately', otherClient === null);

  // -- Cleanup --------------------------------------------------------------

  if (keepKeys) {
    console.log(`\nLeaving the probe keys in place (prefix ratelimit:${probe}).`);
  } else {
    await pipeline(endpoint, [
      ['DEL', probeKey],
      ['DEL', `ratelimit:${probe}:${OTHER_IP}`],
      ['DEL', `ratelimit:${probe}-other:${CLIENT_IP}`],
    ]);
    console.log('\nProbe keys removed.');
  }
}

main()
  .catch((error) => {
    failed += 1;
    console.error(`\n  FAIL  the verification threw: ${error?.message ?? error}`);
  })
  .then(() => {
    console.log('');

    if (failed > 0) {
      console.error(`${failed} of ${passed + failed} checks failed.`);
      process.exit(1);
    }

    console.log(`All ${passed} checks passed. Rate limits are shared across instances.`);
  });
