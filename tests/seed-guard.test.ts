// Demonstration accounts share a password published in this repository, so
// creating them in production would hand anyone who read the repo four live
// logins. This used to be prevented by a code comment.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shouldSeedDemoAccounts } from '../lib/database-seed';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_FLAG = process.env.SEED_DEMO_ACCOUNTS;

// NODE_ENV is declared read-only by @types/node; tests need to vary it.
// Keys are restored individually rather than by reassigning process.env,
// because replacing the object leaves this alias pointing at the old one.
const env = process.env as Record<string, string | undefined>;

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete env[key];
  else env[key] = value;
}

beforeEach(() => {
  delete env.SEED_DEMO_ACCOUNTS;
});

afterEach(() => {
  restore('NODE_ENV', ORIGINAL_NODE_ENV);
  restore('SEED_DEMO_ACCOUNTS', ORIGINAL_FLAG);
});

describe('demonstration account seeding', () => {
  it('is refused in production by default', () => {
    env.NODE_ENV = 'production';
    expect(shouldSeedDemoAccounts()).toBe(false);
  });

  it('is allowed in development', () => {
    env.NODE_ENV = 'development';
    expect(shouldSeedDemoAccounts()).toBe(true);
  });

  it('is allowed when NODE_ENV is unset, as on a fresh clone', () => {
    delete env.NODE_ENV;
    expect(shouldSeedDemoAccounts()).toBe(true);
  });

  it('can be asked for explicitly in production', () => {
    env.NODE_ENV = 'production';
    env.SEED_DEMO_ACCOUNTS = 'true';
    expect(shouldSeedDemoAccounts()).toBe(true);
  });

  it('can be refused explicitly in development', () => {
    env.NODE_ENV = 'development';
    env.SEED_DEMO_ACCOUNTS = 'false';
    expect(shouldSeedDemoAccounts()).toBe(false);
  });

  it('does not treat an arbitrary value as consent', () => {
    env.NODE_ENV = 'production';
    env.SEED_DEMO_ACCOUNTS = 'maybe';
    expect(shouldSeedDemoAccounts()).toBe(false);
  });
});
