// Error reporting.
//
// Every caller of this is already handling a failure, so the rules under test
// are narrow: always log, never throw, never hang, and never require a
// collector to be configured.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reportError, isErrorReportingEnabled } from '../lib/observability';

const ORIGINAL_ENV = { ...process.env };
const DSN = 'https://abc123def456@o1.ingest.sentry.io/42';

beforeEach(() => {
  delete process.env.SENTRY_DSN;
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('configuration', () => {
  it('is off when no DSN is set', () => {
    expect(isErrorReportingEnabled()).toBe(false);
  });

  it('is on with a valid DSN', () => {
    process.env.SENTRY_DSN = DSN;
    expect(isErrorReportingEnabled()).toBe(true);
  });

  it('treats a malformed DSN as off rather than crashing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.SENTRY_DSN = 'not a url';
    expect(isErrorReportingEnabled()).toBe(false);
  });

  it('rejects a DSN with no public key', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.SENTRY_DSN = 'https://o1.ingest.sentry.io/42';
    expect(isErrorReportingEnabled()).toBe(false);
  });

  it('rejects a DSN with no project id', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.SENTRY_DSN = 'https://abc@o1.ingest.sentry.io';
    expect(isErrorReportingEnabled()).toBe(false);
  });
});

describe('logging always happens', () => {
  it('logs with no collector configured', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await reportError(new Error('boom'), { where: 'api/test' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('api/test');
  });

  it('includes extra context in the log line', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await reportError(new Error('boom'), { where: 'api/test', extra: { reportId: 7 } });

    expect(spy.mock.calls[0][0]).toContain('reportId');
  });

  it('logs before attempting to ship, so a send failure loses nothing', async () => {
    process.env.SENTRY_DSN = DSN;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    await reportError(new Error('boom'), { where: 'api/test' });
    expect(spy).toHaveBeenCalled();
  });
});

describe('the envelope', () => {
  async function capture(error: unknown, where = 'api/test') {
    process.env.SENTRY_DSN = DSN;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await reportError(error, { where });

    const [url, init] = fetchSpy.mock.calls[0];
    const lines = (init!.body as string).trim().split('\n');
    return {
      url: String(url),
      auth: (init!.headers as Record<string, string>)['X-Sentry-Auth'],
      header: JSON.parse(lines[0]),
      payload: JSON.parse(lines[2]),
    };
  }

  it('posts to the envelope endpoint derived from the DSN', async () => {
    const { url } = await capture(new Error('boom'));
    expect(url).toBe('https://o1.ingest.sentry.io/api/42/envelope/');
  });

  it('authenticates with the public key from the DSN', async () => {
    const { auth } = await capture(new Error('boom'));
    expect(auth).toContain('sentry_key=abc123def456');
  });

  it('carries the error type and message', async () => {
    const { payload } = await capture(new TypeError('cannot read x'));
    expect(payload.exception.values[0].type).toBe('TypeError');
    expect(payload.exception.values[0].value).toBe('cannot read x');
  });

  it('tags the location so events can be grouped', async () => {
    const { payload } = await capture(new Error('boom'), 'api/emergency/report');
    expect(payload.tags.where).toBe('api/emergency/report');
    expect(payload.transaction).toBe('api/emergency/report');
  });

  it('parses a stack into frames', async () => {
    const { payload } = await capture(new Error('boom'));
    const frames = payload.exception.values[0].stacktrace?.frames;

    expect(Array.isArray(frames)).toBe(true);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toHaveProperty('filename');
    expect(frames[0]).toHaveProperty('lineno');
  });

  it('handles a thrown non-Error without a stack', async () => {
    const { payload } = await capture('just a string');
    expect(payload.exception.values[0].value).toBe('just a string');
    expect(payload.exception.values[0].stacktrace).toBeUndefined();
  });

  it('gives every event an id shared by header and payload', async () => {
    const { header, payload } = await capture(new Error('boom'));
    expect(header.event_id).toBe(payload.event_id);
    expect(header.event_id).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('failures never reach the caller', () => {
  it('swallows a rejected send', async () => {
    process.env.SENTRY_DSN = DSN;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(reportError(new Error('boom'), { where: 'api/test' })).resolves.toBeUndefined();
  });

  it('swallows a rejection from the collector', async () => {
    process.env.SENTRY_DSN = DSN;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 429 }));

    await expect(reportError(new Error('boom'), { where: 'api/test' })).resolves.toBeUndefined();
  });

  it('gives up rather than hanging the request that failed', async () => {
    process.env.SENTRY_DSN = DSN;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })
    );

    const started = Date.now();
    await reportError(new Error('boom'), { where: 'api/test' });

    expect(Date.now() - started).toBeLessThan(4000);
  }, 8000);
});
