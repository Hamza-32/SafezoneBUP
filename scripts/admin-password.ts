/**
 * Account password tools.
 *
 *   npm run admin:audit
 *     Reports which accounts still use a password that is published in this
 *     repository's seed data. Run this against production before opening the
 *     app to the internet.
 *
 *   npm run admin:password -- --email=admin@bup.edu.bd --generate
 *     Sets a strong random password and prints it once.
 *
 *   npm run admin:password -- --email=admin@bup.edu.bd --password="..."
 *     Sets a specific password. It must satisfy the same policy the API
 *     enforces, so a weak one is rejected here too.
 *
 * Both commands read the DB_* variables, so check which database they point
 * at before running. The target is printed on every run.
 */

import dotenv from 'dotenv';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Database } from '../lib/database';
import { passwordSchema } from '../lib/validation';

const BCRYPT_ROUNDS = 12;

/**
 * Passwords that appear in this repository's seed data. Anyone who has read
 * the source knows them, so an account still using one is effectively open.
 */
const PUBLISHED_SEED_PASSWORDS = ['admin123', 'student123'];

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) continue;

    parsed[match[1]] = match[2] === undefined ? true : match[2];
  }

  return parsed;
}

function printTarget(): void {
  const host = process.env.DB_HOST || 'localhost';
  const database = process.env.DB_NAME || 'safezone_db';
  console.log(`Target: ${database} on ${host}\n`);
}

/** Generates a password that satisfies the policy. */
function generatePassword(): string {
  // base64url can omit a character class by chance, so the required classes
  // are appended explicitly and the result is verified below.
  const body = crypto.randomBytes(15).toString('base64url');
  const candidate = `Sz${body}9`;

  return passwordSchema.safeParse(candidate).success ? candidate : generatePassword();
}

async function audit(): Promise<number> {
  printTarget();

  const users = await Database.query(
    "SELECT id, email, role, password FROM users ORDER BY FIELD(role, 'admin', 'security', 'student'), id"
  );

  if (users.length === 0) {
    console.log('No accounts found.');
    return 0;
  }

  const exposed: Array<{ email: string; role: string; password: string }> = [];

  for (const user of users) {
    for (const candidate of PUBLISHED_SEED_PASSWORDS) {
      // bcrypt.compare is the only way to test a hash, so this is a small
      // brute force against a two-item list, not a password dump.
      if (await bcrypt.compare(candidate, user.password)) {
        exposed.push({ email: user.email, role: user.role, password: candidate });
        break;
      }
    }
  }

  console.log(`Checked ${users.length} account${users.length === 1 ? '' : 's'}.\n`);

  if (exposed.length === 0) {
    console.log('✅ No account uses a password published in this repository.');
    return 0;
  }

  console.error(`❌ ${exposed.length} account(s) still use a published seed password:\n`);

  for (const account of exposed) {
    console.error(`   ${account.email}  (${account.role})  password: ${account.password}`);
  }

  console.error('\nRotate each one before this database is reachable from the internet:\n');

  for (const account of exposed) {
    console.error(`   npm run admin:password -- --email=${account.email} --generate`);
  }

  console.error('');

  return 1;
}

async function setPassword(args: Record<string, string | boolean>): Promise<number> {
  printTarget();

  const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';

  if (!email) {
    console.error('❌ Provide the account: --email=someone@bup.edu.bd');
    return 1;
  }

  let password: string;
  let generated = false;

  if (args.generate) {
    password = generatePassword();
    generated = true;
  } else if (typeof args.password === 'string' && args.password.length > 0) {
    password = args.password;
  } else {
    console.error('❌ Provide either --generate or --password="..."');
    return 1;
  }

  const validated = passwordSchema.safeParse(password);

  if (!validated.success) {
    console.error('❌ That password does not meet the policy:');
    for (const issue of validated.error.issues) {
      console.error(`   - ${issue.message}`);
    }
    return 1;
  }

  const users = await Database.query('SELECT id, email, role FROM users WHERE email = ?', [email]);

  if (users.length === 0) {
    console.error(`❌ No account found for ${email}`);
    return 1;
  }

  const user = users[0];
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await Database.query(
    'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
    [hashed, user.id]
  );

  console.log(`✅ Password updated for ${user.email} (${user.role}).`);

  if (generated) {
    console.log('');
    console.log(`   New password: ${password}`);
    console.log('   Save it now. It is stored only as a hash and will not be shown again.');
    console.log('');
  }

  // Existing tokens stay valid until they expire, because nothing tracks
  // issued sessions. Say so rather than implying a rotation logs everyone out.
  console.log('   Note: sessions issued before this change remain valid until they expire.');

  return 0;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv.find((arg) => !arg.startsWith('--')) || 'audit';
  const args = parseArgs(argv);

  let exitCode = 1;

  try {
    const connected = await Database.testConnection();

    if (!connected) {
      console.error('❌ Cannot connect to the database. Check the DB_* variables.');
      process.exit(1);
    }

    if (command === 'audit') {
      exitCode = await audit();
    } else if (command === 'set') {
      exitCode = await setPassword(args);
    } else {
      console.error(`Unknown command: ${command}`);
      console.error('Usage: audit | set --email=<address> (--generate | --password=<value>)');
      exitCode = 1;
    }
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    exitCode = 1;
  } finally {
    await Database.closePool();
  }

  process.exit(exitCode);
}

main();
