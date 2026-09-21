// Fixed-window rate limiting with two backends.
//
// When a Redis REST endpoint is configured, counters are shared across every
// function instance, which is what makes the limits real on a serverless host
// such as Vercel. Set any one of these pairs:
//
//   Vercel KV:  KV_REST_API_URL            + KV_REST_API_TOKEN
//   Upstash:    UPSTASH_REDIS_REST_URL     + UPSTASH_REDIS_REST_TOKEN
//   Explicit:   RATE_LIMIT_REDIS_REST_URL  + RATE_LIMIT_REDIS_REST_TOKEN
//
// All three speak the same HTTP protocol, so no client library is needed.
// Confirm a configured store actually works with: npm run verify:ratelimit
//
// Without those variables the counters fall back to process memory. That is
// correct on a single long-lived server, but on Vercel each concurrent
// instance keeps its own counters and they reset on cold starts, so the
// effective limit is the configured limit times the number of live
// instances. Treat the in-memory mode as spam friction, not a security
// control.
//
// The fallback is deliberate rather than a hard failure: this application
// carries emergency reports, and rejecting an SOS because a rate-limit store
// is unreachable is worse than counting it per instance. Operators who would
// rather refuse traffic can set RATE_LIMIT_REQUIRE_SHARED=true.

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Shared configuration
// ---------------------------------------------------------------------------

interface RedisRestConfig {
  url: string;
  token: string;
  /** Which variable pair supplied the value, for error messages. */
  source: string;
}

/**
 * What the limiter is actually doing right now.
 *
 * `invalid` is kept separate from `absent` on purpose. Not configuring a
 * store is a deliberate choice on a single-process server; configuring one
 * with a typo is an operator mistake that would otherwise look identical at
 * runtime, and would quietly leave production with per-instance limits.
 */
export type RateLimitBackend =
  | { kind: 'shared'; source: string; url: string }
  | { kind: 'absent' }
  | { kind: 'invalid'; source: string; reason: string };

const VARIABLE_PAIRS: Array<{ source: string; url: string; token: string }> = [
  { source: 'KV_REST_API_*', url: 'KV_REST_API_URL', token: 'KV_REST_API_TOKEN' },
  {
    source: 'UPSTASH_REDIS_REST_*',
    url: 'UPSTASH_REDIS_REST_URL',
    token: 'UPSTASH_REDIS_REST_TOKEN',
  },
  {
    source: 'RATE_LIMIT_REDIS_REST_*',
    url: 'RATE_LIMIT_REDIS_REST_URL',
    token: 'RATE_LIMIT_REDIS_REST_TOKEN',
  },
];

/** Token values that are copied out of a template and never replaced. */
const PLACEHOLDER_TOKEN_PATTERNS = [
  /^your[-_ ]?(kv[-_ ]?|redis[-_ ]?|upstash[-_ ]?)?(rest[-_ ]?)?token([-_ ]?here)?$/i,
  /^(changeme|token|example|placeholder|xxx+|\.\.\.)$/i,
  /token[-_ ]?here/i,
  /change[-_ ]?(me|in[-_ ]?production|this)/i,
];

/**
 * A REST endpoint must be a real absolute URL. Plain http is allowed only
 * for loopback, which is how the offline checks point at a local stub; a
 * remote endpoint over http would send the bearer token in clear text.
 */
function validateUrl(raw: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    return `is not a valid URL (got ${JSON.stringify(raw.slice(0, 60))})`;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return `must be an http(s) URL, not ${parsed.protocol}//`;
  }

  const loopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1';

  if (parsed.protocol === 'http:' && !loopback) {
    return 'must use https, otherwise the access token is sent in clear text';
  }

  return null;
}

function validateToken(raw: string): string | null {
  const token = raw.trim();

  if (!token) return 'is empty';

  if (PLACEHOLDER_TOKEN_PATTERNS.some((pattern) => pattern.test(token))) {
    return 'is still a template placeholder';
  }

  return null;
}

/**
 * Work out which backend is in use, validating anything that was configured.
 *
 * The first pair with either variable set wins, so a half-configured pair is
 * reported as a mistake instead of being skipped in favour of the next one.
 */
export function describeRateLimitBackend(): RateLimitBackend {
  for (const pair of VARIABLE_PAIRS) {
    const url = process.env[pair.url];
    const token = process.env[pair.token];

    if (!url && !token) continue;

    if (!url) return { kind: 'invalid', source: pair.source, reason: `${pair.url} is not set` };
    if (!token) return { kind: 'invalid', source: pair.source, reason: `${pair.token} is not set` };

    const urlProblem = validateUrl(url);
    if (urlProblem) {
      return { kind: 'invalid', source: pair.source, reason: `${pair.url} ${urlProblem}` };
    }

    const tokenProblem = validateToken(token);
    if (tokenProblem) {
      return { kind: 'invalid', source: pair.source, reason: `${pair.token} ${tokenProblem}` };
    }

    return { kind: 'shared', source: pair.source, url: url.replace(/\/$/, '') };
  }

  return { kind: 'absent' };
}

/**
 * Turn an already-validated `shared` backend into the values the request
 * path needs. Takes the backend rather than re-deriving it, so a request
 * does not validate the environment twice.
 */
function resolveRedisConfig(backend: RateLimitBackend): RedisRestConfig | null {
  if (backend.kind !== 'shared') return null;

  const pair = VARIABLE_PAIRS.find((candidate) => candidate.source === backend.source);
  if (!pair) return null;

  return {
    url: backend.url,
    token: (process.env[pair.token] as string).trim(),
    source: backend.source,
  };
}

/** True when counters are shared across instances. */
export function isSharedRateLimitEnabled(): boolean {
  return describeRateLimitBackend().kind === 'shared';
}

/**
 * When set, a request is refused outright rather than counted in process
 * memory if the shared store is missing or unreachable.
 *
 * Off by default, and that default is deliberate for this application: an
 * outage at the rate-limit store would otherwise reject emergency reports.
 * Weaker limits during an outage are the lesser harm. Turn it on only where
 * rejecting traffic is preferable to counting it per instance.
 */
function strictModeEnabled(): boolean {
  const raw = process.env.RATE_LIMIT_REQUIRE_SHARED;
  return raw === '1' || /^(true|yes|on)$/i.test(raw ?? '');
}

/**
 * Fallback warnings repeat rather than firing once per process.
 *
 * A single line at boot is lost in the log within minutes, which is how a
 * production deployment can run for weeks on per-instance limits without
 * anyone noticing. Repeating every few minutes keeps an ongoing outage
 * visible without filling the log on every request.
 */
const WARN_INTERVAL_MS = 5 * 60_000;

let lastWarnedAt = 0;

function warnMemoryFallback(reason: string): void {
  const now = Date.now();
  if (lastWarnedAt && now - lastWarnedAt < WARN_INTERVAL_MS) return;
  lastWarnedAt = now;

  console.warn(
    `⚠️  Rate limiting is using per-process memory (${reason}). ` +
      'On a serverless host the limits reset on cold starts and are not shared between ' +
      'instances. Set KV_REST_API_URL and KV_REST_API_TOKEN to share them, then confirm ' +
      'with: npm run verify:ratelimit'
  );
}

/** Reset the warning throttle. Intended for tests only. */
export function resetRateLimitWarnings(): void {
  lastWarnedAt = 0;
}

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

interface Counter {
  count: number;
  resetAt: number;
}

const counters = new Map<string, Counter>();

let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;

  for (const [key, counter] of counters) {
    if (counter.resetAt <= now) {
      counters.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Count one hit against `key` in process memory.
 * Exported so it can be tested without a Redis endpoint.
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = counters.get(key);

  if (!existing || existing.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Clears the in-memory counters. Intended for tests only. */
export function resetRateLimits(): void {
  counters.clear();
}

// ---------------------------------------------------------------------------
// Shared Redis backend
// ---------------------------------------------------------------------------

const REDIS_TIMEOUT_MS = 1500;

/**
 * Count one hit against `key` in Redis, using a single HTTP round trip.
 *
 * The pipeline is:
 *   SET key 0 EX <window> NX   establish the window exactly once
 *   INCR key                   count this request
 *   TTL key                    how long until the window resets
 *
 * SET with NX is what makes the window fixed rather than sliding: the
 * expiry is written when the window opens and is not extended by later
 * requests, so a caller who stops hitting the endpoint always recovers.
 *
 * Returns null if the endpoint cannot be reached, so the caller can fall
 * back rather than fail the request.
 */
async function rateLimitShared(
  config: RedisRestConfig,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  const namespaced = `ratelimit:${key}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SET', namespaced, '0', 'EX', String(windowSeconds), 'NX'],
        ['INCR', namespaced],
        ['TTL', namespaced],
      ]),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Rate limit store returned HTTP ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>;

    if (!Array.isArray(payload) || payload.length < 3) {
      console.error('Rate limit store returned an unexpected payload shape');
      return null;
    }

    const failed = payload.find((entry) => entry?.error);
    if (failed) {
      console.error(`Rate limit store error: ${failed.error}`);
      return null;
    }

    const count = Number(payload[1]?.result);
    const ttl = Number(payload[2]?.result);

    if (!Number.isFinite(count)) {
      console.error('Rate limit store returned a non-numeric count');
      return null;
    }

    // A missing or absent TTL should not make the window immortal.
    const retryAfterSeconds = Number.isFinite(ttl) && ttl > 0 ? ttl : windowSeconds;

    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    return { allowed: true, remaining: Math.max(0, limit - count), retryAfterSeconds: 0 };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error(
      aborted ? 'Rate limit store timed out' : 'Rate limit store request failed:',
      aborted ? '' : error
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Client identity
// ---------------------------------------------------------------------------

/**
 * Best-effort client identity for rate limiting.
 *
 * x-forwarded-for is only trustworthy behind a proxy that overwrites it,
 * which Vercel does. On a directly exposed server a client can forge this
 * header, so treat the result as a spam control, not an authorization
 * boundary.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

// ---------------------------------------------------------------------------
// Entry point used by routes
// ---------------------------------------------------------------------------

/**
 * Apply a rate limit and return a 429 if it has been exceeded, or null when
 * the caller may proceed.
 *
 * `bucket` namespaces the limit, so login attempts and emergency reports
 * from the same address are counted separately. `extraKey` narrows it
 * further, for example to a specific email address or user id.
 *
 * Never throws: if the shared store is unreachable this falls back to the
 * in-memory counters rather than rejecting or allowing everything.
 */
export async function enforceRateLimit(
  request: NextRequest,
  bucket: string,
  limit: number,
  windowSeconds: number,
  extraKey?: string
): Promise<NextResponse | null> {
  const identity = extraKey ? `${getClientIp(request)}:${extraKey}` : getClientIp(request);
  const key = `${bucket}:${identity}`;

  const backend = describeRateLimitBackend();
  let result: RateLimitResult | null = null;
  let degraded: string | null = null;

  if (backend.kind === 'shared') {
    const config = resolveRedisConfig(backend);
    result = config ? await rateLimitShared(config, key, limit, windowSeconds) : null;

    if (!result) degraded = 'the shared store is unreachable';
  } else if (backend.kind === 'invalid') {
    // Configured, but wrong. Worth saying exactly what is wrong, because the
    // operator meant to have shared limits and currently does not.
    degraded = `${backend.source} is misconfigured: ${backend.reason}`;
  } else {
    degraded = 'no Redis REST endpoint is configured';
  }

  if (degraded) {
    warnMemoryFallback(degraded);

    if (strictModeEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limiting is temporarily unavailable. Please try again shortly.',
        },
        {
          status: 503,
          headers: { 'Retry-After': '30' },
        }
      );
    }

  }

  // Only reachable when the shared store was unavailable and strict mode is
  // off, so the counters are per process for this request.
  if (!result) {
    result = rateLimit(key, limit, windowSeconds);
  }

  if (result.allowed) return null;

  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please slow down and try again shortly.',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    }
  );
}
