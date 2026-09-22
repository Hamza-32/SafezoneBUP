// Error reporting.
//
// Every failure in this application went to console.error, which on a
// serverless host means it lands in a log nobody is watching. app/error.tsx
// already shows the visitor a digest to quote, but nothing was collecting the
// other half of that pair, so the digest identified an event no one could
// look up.
//
// Sentry's ingest API is plain HTTP, so this talks to it directly rather than
// pulling in @sentry/nextjs. That keeps the serverless bundle small and
// matches how lib/rate-limit speaks to Redis. Set:
//
//   SENTRY_DSN   from sentry.io (5,000 errors a month on the free plan)
//
// Without it, errors are still logged with their context, which is strictly
// better than what was here before. Reporting never throws and never blocks:
// a monitoring outage must not become an application outage.

interface ParsedDsn {
  endpoint: string;
  publicKey: string;
}

/**
 * A Sentry DSN is a URL that encodes the ingest endpoint and a public key:
 *   https://<publicKey>@<host>/<projectId>
 */
function parseDsn(raw: string): ParsedDsn | null {
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\//, '');

    if (!url.username || !projectId) return null;

    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey: url.username,
    };
  } catch {
    return null;
  }
}

let warnedAboutMissingDsn = false;

function resolveDsn(): ParsedDsn | null {
  const raw = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!raw) {
    if (!warnedAboutMissingDsn && process.env.NODE_ENV === 'production') {
      warnedAboutMissingDsn = true;
      console.warn(
        '⚠️  SENTRY_DSN is not set. Errors are logged but not collected, so a ' +
          'failure in production is only visible to whoever reads the logs.'
      );
    }
    return null;
  }

  const parsed = parseDsn(raw);
  if (!parsed) {
    console.error('SENTRY_DSN is set but is not a valid DSN URL. Errors will not be collected.');
    return null;
  }

  return parsed;
}

/** True when errors are shipped somewhere, not just logged. */
export function isErrorReportingEnabled(): boolean {
  return resolveDsn() !== null;
}

export interface ErrorContext {
  /** Where this happened, e.g. 'api/emergency/report'. */
  where: string;
  /** Anything that helps reproduce it. Must not contain personal data. */
  extra?: Record<string, string | number | boolean | null>;
}

const SEND_TIMEOUT_MS = 2000;

function buildEnvelope(error: unknown, context: ErrorContext, dsn: ParsedDsn): string {
  const eventId = crypto.randomUUID().replace(/-/g, '');
  const sentAt = new Date().toISOString();

  const message = error instanceof Error ? error.message : String(error);
  const type = error instanceof Error ? error.name : 'Error';
  const stack = error instanceof Error ? error.stack : undefined;

  const header = JSON.stringify({ event_id: eventId, sent_at: sentAt, dsn: undefined });
  const itemHeader = JSON.stringify({ type: 'event' });
  const payload = JSON.stringify({
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: 'error',
    environment: process.env.NODE_ENV || 'development',
    server_name: undefined,
    transaction: context.where,
    exception: {
      values: [
        {
          type,
          value: message,
          stacktrace: stack ? { frames: parseStack(stack) } : undefined,
        },
      ],
    },
    tags: { where: context.where },
    extra: context.extra,
  });

  return `${header}\n${itemHeader}\n${payload}\n`;
}

interface StackFrame {
  function: string;
  filename: string;
  lineno: number;
  colno: number;
}

/**
 * Turn a V8 stack string into Sentry's frame list, oldest first.
 * Best effort: an unparseable line is skipped rather than failing the report.
 */
function parseStack(stack: string): StackFrame[] {
  return stack
    .split('\n')
    .slice(1)
    .map((line): StackFrame | null => {
      const match = /at (?:(.+?) )?\(?(.+?):(\d+):(\d+)\)?$/.exec(line.trim());
      if (!match) return null;

      return {
        function: match[1] || '<anonymous>',
        filename: match[2],
        lineno: Number(match[3]),
        colno: Number(match[4]),
      };
    })
    .filter((frame): frame is StackFrame => frame !== null)
    .reverse();
}

/**
 * Record an error, and ship it if a collector is configured.
 *
 * Always logs. Never throws, never rejects, and gives up after two seconds,
 * because every caller is already handling a failure and must not acquire a
 * second one.
 */
export async function reportError(error: unknown, context: ErrorContext): Promise<void> {
  const detail = context.extra ? ` ${JSON.stringify(context.extra)}` : '';
  console.error(`[${context.where}]${detail}`, error);

  const dsn = resolveDsn();
  if (!dsn) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    await fetch(dsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': [
          'Sentry sentry_version=7',
          'sentry_client=safezonebup/1.0',
          `sentry_key=${dsn.publicKey}`,
        ].join(', '),
      },
      body: buildEnvelope(error, context, dsn),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    // Deliberately silent. This path is already inside error handling, and a
    // failed report logging its own failure would be noise at best and a loop
    // at worst. The console.error above is the durable record.
  } finally {
    clearTimeout(timer);
  }
}
