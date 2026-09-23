// Out-of-band delivery for alerts that must not wait for someone to open the
// dashboard.
//
// Until now every alert in this application was an INSERT into `notifications`
// and nothing more, so an SOS raised at 3am reached a responder whenever they
// next happened to load the page. The in-app row is still the record of
// truth; this module is what makes someone look at it.
//
// Email rather than SMS, because SMS has no free tier anywhere and this has to
// run on a free plan. A responder's mail client raises a push notification on
// their phone, which is most of the value of SMS. Set:
//
//   RESEND_API_KEY   from resend.com (3,000 emails a month, no card)
//   ALERT_FROM       a verified sender, or onboarding@resend.dev to try it
//
// Without them the application still works and still records every alert in
// the database; it simply does not push. That degradation is deliberate:
// refusing to file an emergency report because an email provider is down
// would be a far worse failure than a late notification.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// Kept short on purpose. This runs inside the request that files an emergency
// report, and the reporter should never wait on an email provider.
const SEND_TIMEOUT_MS = 4000;

export type AlertSeverity = 'emergency' | 'warning';

export interface AlertRecipient {
  email: string;
  firstName?: string | null;
}

export interface Alert {
  severity: AlertSeverity;
  subject: string;
  /** Plain sentences. Rendered as both the text body and the HTML body. */
  lines: string[];
  /** Shown as a footer, e.g. a reference code. */
  reference?: string;
}

interface DeliveryConfig {
  apiKey: string;
  from: string;
}

function resolveConfig(): DeliveryConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.length < 10) return null;

  // Resend accepts onboarding@resend.dev without domain verification, which
  // makes it possible to try this out before owning a domain.
  const from = process.env.ALERT_FROM || 'SafezoneBUP <onboarding@resend.dev>';

  return { apiKey, from };
}

/** True when alerts are pushed as well as recorded. */
export function isAlertDeliveryEnabled(): boolean {
  return resolveConfig() !== null;
}

const WARN_INTERVAL_MS = 15 * 60_000;
let lastWarnedAt = 0;

function warnNotConfigured(): void {
  const now = Date.now();
  if (lastWarnedAt && now - lastWarnedAt < WARN_INTERVAL_MS) return;
  lastWarnedAt = now;

  console.warn(
    '⚠️  RESEND_API_KEY is not set, so alerts are recorded in the database but ' +
      'not delivered. A responder will only see an emergency when they next open ' +
      'the dashboard. See the alerting section of RUNNING.md.'
  );
}

/** Resets the warning throttle. Intended for tests only. */
export function resetAlertWarnings(): void {
  lastWarnedAt = 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(alert: Alert): string {
  const accent = alert.severity === 'emergency' ? '#b91c2c' : '#b45309';
  const heading = alert.severity === 'emergency' ? 'Emergency' : 'Attention needed';

  const body = alert.lines
    .map((line) => `<p style="margin:0 0 12px;line-height:1.5;">${escapeHtml(line)}</p>`)
    .join('');

  const footer = alert.reference
    ? `<p style="margin:16px 0 0;font-size:12px;color:#666;">Reference: ${escapeHtml(
        alert.reference
      )}</p>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f6f6;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="background:${accent};color:#fff;padding:14px 20px;font-weight:600;">${heading}</div>
    <div style="padding:20px;">
      <h1 style="margin:0 0 14px;font-size:18px;">${escapeHtml(alert.subject)}</h1>
      ${body}
      ${footer}
      <p style="margin:20px 0 0;font-size:12px;color:#666;">
        Sent by SafezoneBUP. In a life-threatening emergency call 999.
      </p>
    </div>
  </div>
</body></html>`;
}

function renderText(alert: Alert): string {
  const parts = [alert.subject, '', ...alert.lines];
  if (alert.reference) parts.push('', `Reference: ${alert.reference}`);
  parts.push('', 'Sent by SafezoneBUP. In a life-threatening emergency call 999.');
  return parts.join('\n');
}

/**
 * Deliver an alert to every recipient.
 *
 * Never throws and never rejects: every call site is in the middle of
 * recording something that already succeeded, and a delivery failure must not
 * undo it. Returns how many messages were accepted, for logging.
 */
export async function deliverAlert(
  recipients: AlertRecipient[],
  alert: Alert
): Promise<{ sent: number; skipped: number }> {
  const addresses = recipients
    .map((r) => r.email)
    .filter((email): email is string => Boolean(email && email.includes('@')));

  if (addresses.length === 0) return { sent: 0, skipped: 0 };

  const config = resolveConfig();
  if (!config) {
    warnNotConfigured();
    return { sent: 0, skipped: addresses.length };
  }

  const body = {
    from: config.from,
    subject: alert.subject,
    text: renderText(alert),
    html: renderHtml(alert),
  };

  // One request per recipient, deliberately, even though addressing them all
  // in a single call would use less of the free tier's quota.
  //
  // Resend rejects the whole request if any one address is unroutable, so a
  // single stale responder — someone who left, a typo in an address nobody
  // has checked in months — silenced the alert for every other responder at
  // the same time. That is the wrong way round: the more responders there
  // are, the more likely it becomes that none of them hear about an
  // emergency.
  //
  // Sent concurrently, so the wall-clock cost is one request, not N.
  const results = await Promise.all(
    addresses.map((address) => sendOne(config, address, body))
  );

  const sent = results.filter(Boolean).length;
  const skipped = results.length - sent;

  if (skipped > 0) {
    console.error(
      `Alert reached ${sent} of ${results.length} responder(s). ` +
        'The rest were not delivered; check the provider log for which.'
    );
  }

  return { sent, skipped };
}

/**
 * Deliver to one address. Returns whether it was accepted.
 * Never throws: a failure for one recipient must not affect the others.
 */
async function sendOne(
  config: DeliveryConfig,
  address: string,
  body: { from: string; subject: string; text: string; html: string }
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, to: [address] }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(
        `Alert to ${address} failed with HTTP ${response.status}. ${detail.slice(0, 200)}`
      );
      return false;
    }

    return true;
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error(
      aborted
        ? `Alert to ${address} timed out after ${SEND_TIMEOUT_MS}ms`
        : `Alert to ${address} threw: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The people who should be told about an incident.
 *
 * Staff only. A student never receives another student's alert.
 */
export async function loadResponderRecipients(
  query: (sql: string, params?: unknown[]) => Promise<any>
): Promise<AlertRecipient[]> {
  const rows = await query(
    "SELECT email, firstName FROM users WHERE role IN ('admin', 'security') AND email IS NOT NULL"
  );

  return rows.map((row: { email: string; firstName: string | null }) => ({
    email: row.email,
    firstName: row.firstName,
  }));
}
