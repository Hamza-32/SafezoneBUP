// Demonstration accounts share a password published in this repository, so
// creating them in production would hand anyone who read the repo four live
// logins. This used to be prevented by a code comment.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shouldSeedDemoAccounts } from '../lib/database-seed';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_FLAG = process.env.SEED_DEMO_ACCOUNTS;
const ORIGINAL_DB_URL = process.env.DATABASE_URL;
const ORIGINAL_DB = process.env.DATABASE_URL;

// NODE_ENV is declared read-only by @types/node; tests need to vary it.
// Keys are restored individually rather than by reassigning process.env,
// because replacing the object leaves this alias pointing at the old one.
const env = process.env as Record<string, string | undefined>;

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete env[key];
  else env[key] = value;
}

const LOCAL_DB = 'postgresql://user:pw@localhost:5432/postgres';
const REMOTE_DB = 'postgresql://user:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

beforeEach(() => {
  delete env.SEED_DEMO_ACCOUNTS;
  // Default to a local target so the NODE_ENV cases below test NODE_ENV.
  env.DATABASE_URL = LOCAL_DB;
});

afterEach(() => {
  restore('NODE_ENV', ORIGINAL_NODE_ENV);
  restore('SEED_DEMO_ACCOUNTS', ORIGINAL_FLAG);
  restore('DATABASE_URL', ORIGINAL_DB_URL);
  restore('DATABASE_URL', ORIGINAL_DB);
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

  it('is refused against a remote database even with NODE_ENV unset', () => {
    // The documented production setup: run db:init from a laptop against
    // Supabase. NODE_ENV is undefined there, and the old guard let it through.
    delete env.NODE_ENV;
    env.DATABASE_URL = REMOTE_DB;
    expect(shouldSeedDemoAccounts()).toBe(false);
  });

  it('is refused against a remote database in development', () => {
    env.NODE_ENV = 'development';
    env.DATABASE_URL = REMOTE_DB;
    expect(shouldSeedDemoAccounts()).toBe(false);
  });

  it('can still be asked for explicitly against a remote database', () => {
    env.NODE_ENV = 'development';
    env.DATABASE_URL = REMOTE_DB;
    env.SEED_DEMO_ACCOUNTS = 'true';
    expect(shouldSeedDemoAccounts()).toBe(true);
  });

  it('does not treat an arbitrary value as consent', () => {
    env.NODE_ENV = 'production';
    env.SEED_DEMO_ACCOUNTS = 'maybe';
    expect(shouldSeedDemoAccounts()).toBe(false);
  });
});

describe("the target database, not the operator's machine", () => {
  // NODE_ENV describes where the code runs, not which database it is pointed
  // at. Seeding a production Supabase from a laptop leaves NODE_ENV unset or
  // "development", so keying only on it would have created four accounts on
  // a published password in the real database — the exact case the guard
  // exists to prevent.
  const REMOTE = 'postgresql://postgres:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

  it('refuses a remote database even when NODE_ENV is development', () => {
    env.NODE_ENV = 'development';
    env.DATABASE_URL = REMOTE;
    expect(shouldSeedDemoAccounts()).toBe(false);
  });

  it('refuses a remote database even when NODE_ENV is unset', () => {
    delete env.NODE_ENV;
    env.DATABASE_URL = REMOTE;
    expect(shouldSeedDemoAccounts()).toBe(false);
  });

  it('still allows a local database in development', () => {
    env.NODE_ENV = 'development';
    env.DATABASE_URL = 'postgresql://user:pw@localhost:5432/postgres';
    expect(shouldSeedDemoAccounts()).toBe(true);
  });

  it('allows a remote database only when asked explicitly', () => {
    env.NODE_ENV = 'development';
    env.DATABASE_URL = REMOTE;
    env.SEED_DEMO_ACCOUNTS = 'true';
    expect(shouldSeedDemoAccounts()).toBe(true);
  });

  it('treats an unparseable DATABASE_URL as remote', () => {
    env.NODE_ENV = 'development';
    env.DATABASE_URL = 'not a url';
    expect(shouldSeedDemoAccounts()).toBe(false);
  });
});
