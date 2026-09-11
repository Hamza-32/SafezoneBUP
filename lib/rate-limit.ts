// Fixed-window rate limiting with two backends.
//
// When a Redis REST endpoint is configured, counters are shared across every
// function instance, which is what makes the limits real on a serverless host
// such as Vercel. Set either pair of variables:
//
//   Vercel KV:  KV_REST_API_URL          + KV_REST_API_TOKEN
//   Upstash:    UPSTASH_REDIS_REST_URL   + UPSTASH_REDIS_REST_TOKEN
//
// Both speak the same HTTP protocol, so no client library is needed.
//
// Without those variables the counters fall back to process memory. That is
// correct on a single long-lived server, but on Vercel each concurrent
// instance keeps its own counters and they reset on cold starts, so the
// effective limit is the configured limit times the number of live
// instances. Treat the in-memory mode as spam friction, not a security
// control.

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Shared configuration
// ---------------------------------------------------------------------------

interface RedisRestConfig {
  url: string;
  token: string;
}

function resolveRedisConfig(): RedisRestConfig | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.RATE_LIMIT_REDIS_REST_URL;

  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.RATE_LIMIT_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return { url: url.replace(/\/$/, ''), token };
}

/** True when counters are shared across instances. */
export function isSharedRateLimitEnabled(): boolean {
  return resolveRedisConfig() !== null;
}

let warnedAboutMemoryFallback = false;

function warnMemoryFallbackOnce(reason: string): void {
  if (warnedAboutMemoryFallback) return;
  warnedAboutMemoryFallback = true;

  console.warn(
    `⚠️  Rate limiting is using per-process memory (${reason}). ` +
      'On a serverless host the limits reset on cold starts and are not shared between ' +
      'instances. Set KV_REST_API_URL and KV_REST_API_TOKEN to share them.'
  );
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

  const config = resolveRedisConfig();
  let result: RateLimitResult | null = null;

  if (config) {
    result = await rateLimitShared(config, key, limit, windowSeconds);

    if (!result) {
      warnMemoryFallbackOnce('the shared store is unreachable');
    }
  } else {
    warnMemoryFallbackOnce('no Redis REST endpoint is configured');
  }

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
