/**
 * Accessibility checks against a running server.
 *
 *   1. npm run dev        (in another terminal)
 *   2. npm run verify:a11y
 *
 * Walks every page through the real navigation and runs axe-core against
 * WCAG 2.0/2.1 A and AA. Exits non-zero if anything is found, so it can gate
 * a release.
 *
 * Uses the Chrome already installed on the machine rather than downloading a
 * browser, which is why this is not in CI: it needs a desktop Chrome and a
 * running server, neither of which a lint job should assume.
 *
 * Options:
 *   --url=http://localhost:3000   server to test
 */

const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const urlArg = process.argv.find((a) => a.startsWith('--url='));
const SITE = urlArg ? urlArg.slice('--url='.length) : process.argv[2] || 'http://localhost:3000';

const ROUTES = [
  { name: 'home', nav: [] },
  { name: 'bup-info', nav: [['button', 'About BUP']] },
  { name: 'safety-resources', nav: [['button', 'Safety Resources']] },
  { name: 'emergency', nav: [['button', 'Emergency']] },
  { name: 'complaint', nav: [['button', 'Safety Tools'], ['menuitem', 'File Complaint']] },
  { name: 'discussion', nav: [['button', 'Safety Tools'], ['menuitem', 'Discussion Board']] },
  { name: 'checkin', nav: [['button', 'Safety Tools'], ['menuitem', 'Check-In']] },
  { name: 'lost-and-found', nav: [['button', 'Safety Tools'], ['menuitem', 'Lost & Found']] },
  { name: 'login', nav: [['button', 'Log in']] },
  { name: 'signup', nav: [['button', 'Sign Up']] },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const totals = new Map();

  for (const route of ROUTES) {
    const page = await context.newPage();
    await page.goto(SITE, { waitUntil: 'networkidle' });

    for (const [role, label] of route.nav) {
      await page.getByRole(role, { name: label, exact: true }).first().click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    console.log(
      `${route.name.padEnd(17)} ${String(results.violations.length).padStart(2)} violations  ` +
        `(${serious.length} serious+)`
    );

    for (const v of results.violations) {
      const key = `${v.id}|${v.impact}|${v.help}`;
      const entry = totals.get(key) || { count: 0, pages: new Set(), sample: '' };
      entry.count += v.nodes.length;
      entry.pages.add(route.name);
      if (!entry.sample) entry.sample = (v.nodes[0]?.html || '').slice(0, 100);
      totals.set(key, entry);
    }

    await page.close();
  }

  console.log('\n--- distinct issues, worst first ---');
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const sorted = [...totals.entries()].sort((a, b) => {
    const [, ia] = a[0].split('|');
    const [, ib] = b[0].split('|');
    return (order[ia] ?? 9) - (order[ib] ?? 9);
  });

  for (const [key, entry] of sorted) {
    const [id, impact, help] = key.split('|');
    console.log(`\n[${impact}] ${id} — ${help}`);
    console.log(`  ${entry.count} node(s) across: ${[...entry.pages].join(', ')}`);
    console.log(`  e.g. ${entry.sample}`);
  }

  const total = [...totals.values()].reduce((sum, e) => sum + e.count, 0);

  await browser.close();

  if (total === 0) {
    console.log('\nNo WCAG A or AA violations found.');
    process.exit(0);
  }

  console.error(`\n${total} violating node(s) across ${totals.size} distinct issue(s).`);
  process.exit(1);
})();
