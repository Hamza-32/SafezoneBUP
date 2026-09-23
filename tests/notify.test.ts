// Alert delivery.
//
// This module runs inside the request that files an emergency report, and it
// composes HTML from values a reporter controls. Both facts are what these
// tests are about: it must never throw, never hang, and never let a location
// string become markup in a responder's mail client.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  deliverAlert,
  isAlertDeliveryEnabled,
  loadResponderRecipients,
  resetAlertWarnings,
} from '../lib/notify';

const ORIGINAL_ENV = { ...process.env };

function configure() {
  process.env.RESEND_API_KEY = 're_test_key_1234567890';
  process.env.ALERT_FROM = 'SafezoneBUP <alerts@example.test>';
}

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.ALERT_FROM;
  resetAlertWarnings();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const ALERT = {
  severity: 'emergency' as const,
  subject: 'Emergency reported',
  lines: ['A medical emergency has been reported.'],
  reference: 'EMG-123',
};

const RECIPIENTS = [{ email: 'responder@bup.edu.bd', firstName: 'Ayesha' }];

describe('configuration', () => {
  it('is disabled when no API key is set', () => {
    expect(isAlertDeliveryEnabled()).toBe(false);
  });

  it('is disabled when the key is too short to be real', () => {
    process.env.RESEND_API_KEY = 'short';
    expect(isAlertDeliveryEnabled()).toBe(false);
  });

  it('is enabled once a plausible key is set', () => {
    configure();
    expect(isAlertDeliveryEnabled()).toBe(true);
  });
});

describe('delivery without a provider', () => {
  it('reports every recipient as skipped rather than throwing', async () => {
    const result = await deliverAlert(RECIPIENTS, ALERT);
    expect(result).toEqual({ sent: 0, skipped: 1 });
  });

  it('warns once rather than on every alert', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await deliverAlert(RECIPIENTS, ALERT);
    await deliverAlert(RECIPIENTS, ALERT);
    await deliverAlert(RECIPIENTS, ALERT);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not call out to the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await deliverAlert(RECIPIENTS, ALERT);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('recipient handling', () => {
  it('sends nothing when the recipient list is empty', async () => {
    configure();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await deliverAlert([], ALERT);

    expect(result).toEqual({ sent: 0, skipped: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('drops entries with no usable address', async () => {
    configure();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await deliverAlert(
      [
        { email: 'good@bup.edu.bd' },
        { email: '' },
        { email: 'not-an-address' },
        { email: 'also.good@bup.edu.bd' },
      ],
      ALERT
    );

    const addressed = fetchSpy.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string).to[0]
    );
    expect(addressed).toEqual(['good@bup.edu.bd', 'also.good@bup.edu.bd']);
  });

  // Deliberately one request each, not one addressed to everyone. Resend
  // rejects an entire request if any single address is unroutable, so batching
  // let one stale responder silence the alert for all the others.
  it('sends one request per recipient', async () => {
    configure();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await deliverAlert(
      [{ email: 'a@bup.edu.bd' }, { email: 'b@bup.edu.bd' }, { email: 'c@bup.edu.bd' }],
      ALERT
    );

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ sent: 3, skipped: 0 });

    for (const call of fetchSpy.mock.calls) {
      expect(JSON.parse((call[1] as RequestInit).body as string).to).toHaveLength(1);
    }
  });

  it('still reaches the others when one address is rejected', async () => {
    configure();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      return Promise.resolve(
        body.to[0] === 'stale@bup.edu.bd'
          ? new Response('invalid recipient', { status: 422 })
          : new Response('{}', { status: 200 })
      );
    });

    const result = await deliverAlert(
      [{ email: 'stale@bup.edu.bd' }, { email: 'live@bup.edu.bd' }],
      ALERT
    );

    expect(result).toEqual({ sent: 1, skipped: 1 });
  });

  it('still reaches the others when one send throws', async () => {
    configure();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      return body.to[0] === 'broken@bup.edu.bd'
        ? Promise.reject(new Error('ECONNRESET'))
        : Promise.resolve(new Response('{}', { status: 200 }));
    });

    const result = await deliverAlert(
      [{ email: 'broken@bup.edu.bd' }, { email: 'live@bup.edu.bd' }],
      ALERT
    );

    expect(result).toEqual({ sent: 1, skipped: 1 });
  });
});

describe('message content', () => {
  async function capture(alert = ALERT) {
    configure();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await deliverAlert(RECIPIENTS, alert);
    return JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
  }

  it('carries both a text and an HTML body', async () => {
    const body = await capture();
    expect(body.text).toContain('A medical emergency has been reported.');
    expect(body.html).toContain('A medical emergency has been reported.');
  });

  it('includes the reference in both bodies', async () => {
    const body = await capture();
    expect(body.text).toContain('EMG-123');
    expect(body.html).toContain('EMG-123');
  });

  it('tells the reader to call 999', async () => {
    const body = await capture();
    expect(body.text).toContain('999');
  });

  // A location or description comes from whoever filed the report, including
  // an anonymous one. It must not be able to inject markup into the mail a
  // responder opens.
  it('escapes markup in a reported location', async () => {
    const body = await capture({
      ...ALERT,
      lines: ['Location: <script>alert(1)</script>'],
    });

    expect(body.html).not.toContain('<script>');
    expect(body.html).toContain('&lt;script&gt;');
  });

  it('escapes markup in the subject', async () => {
    const body = await capture({
      ...ALERT,
      subject: 'Emergency at <img src=x onerror=alert(1)>',
    });

    expect(body.html).not.toContain('<img src=x');
    expect(body.html).toContain('&lt;img src=x');
  });

  it('escapes an attribute break in a reference', async () => {
    const body = await capture({ ...ALERT, reference: 'EMG-"><b>x</b>' });
    expect(body.html).not.toContain('<b>x</b>');
  });

  it('uses the configured sender', async () => {
    const body = await capture();
    expect(body.from).toBe('SafezoneBUP <alerts@example.test>');
  });

  it('falls back to a sender that needs no verified domain', async () => {
    process.env.RESEND_API_KEY = 're_test_key_1234567890';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await deliverAlert(RECIPIENTS, ALERT);
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);

    expect(body.from).toContain('onboarding@resend.dev');
  });
});

describe('failures never reach the caller', () => {
  it('survives a rejected request', async () => {
    configure();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('quota exceeded', { status: 429 })
    );

    await expect(deliverAlert(RECIPIENTS, ALERT)).resolves.toEqual({ sent: 0, skipped: 1 });
  });

  it('survives the provider being unreachable', async () => {
    configure();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(deliverAlert(RECIPIENTS, ALERT)).resolves.toEqual({ sent: 0, skipped: 1 });
  });

  it('survives a malformed response body', async () => {
    configure();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not json at all', { status: 200 })
    );

    await expect(deliverAlert(RECIPIENTS, ALERT)).resolves.toEqual({ sent: 1, skipped: 0 });
  });

  it('gives up rather than hanging the report that triggered it', async () => {
    configure();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Resolve only when the caller aborts, which is what a hung provider
    // looks like from here.
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })
    );

    const started = Date.now();
    const result = await deliverAlert(RECIPIENTS, ALERT);

    expect(result.sent).toBe(0);
    expect(Date.now() - started).toBeLessThan(6000);
  }, 10_000);
});

describe('responder lookup', () => {
  it('asks only for staff accounts', async () => {
    let captured = '';
    await loadResponderRecipients(async (sql: string) => {
      captured = sql;
      return [];
    });

    expect(captured).toContain("role IN ('admin', 'security')");
  });

  it('maps rows to recipients', async () => {
    const recipients = await loadResponderRecipients(async () => [
      { email: 'a@bup.edu.bd', firstName: 'A' },
    ]);

    expect(recipients).toEqual([{ email: 'a@bup.edu.bd', firstName: 'A' }]);
  });
});
