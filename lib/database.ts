import { Pool, types as pgTypes, type PoolClient } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { restoreRowCase } from './database-columns';

// Load environment variables
// .env.local is loaded first on purpose. dotenv never overwrites a variable
// that is already set, so whichever file is read first wins. Loading .env
// first meant a stale value there silently beat the real one in .env.local,
// which is the opposite of how Next.js itself resolves them.
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

// PostgreSQL returns bigint as a string, because a 64-bit integer does not
// fit in a JavaScript number. COUNT(*) has that type, so without this every
// count would arrive as "12" and arithmetic or a JSON response would be
// wrong. The counts in this schema are far below the safe integer limit.
pgTypes.setTypeParser(pgTypes.builtins.INT8, (value) => parseInt(value, 10));

// NUMERIC is also returned as a string to preserve exact precision. The only
// numeric columns here are latitude and longitude, which are more useful to
// a caller as numbers.
pgTypes.setTypeParser(pgTypes.builtins.NUMERIC, (value) => parseFloat(value));

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

/**
 * Connections per pool.
 *
 * On a serverless host every concurrent function instance builds its own
 * pool, so the real connection count is this number times the number of live
 * instances. Keep it small and connect through Supabase's pooler, which is
 * what actually absorbs the concurrency.
 */
const DEFAULT_CONNECTION_LIMIT = process.env.VERCEL ? 2 : 10;

/**
 * TLS settings.
 *
 * Supabase requires an encrypted connection, and its connection pooler
 * presents a certificate signed by Supabase's own authority rather than one
 * Node already trusts. Verifying it therefore needs that authority's
 * certificate, which the dashboard offers under Database, SSL Configuration.
 *
 * Supply it either way round:
 *   DB_SSL_CA_FILE  path to the downloaded .crt file (easiest locally)
 *   DB_SSL_CA       the PEM contents themselves (for a hosting dashboard,
 *                   which cannot hold real newlines, so \n escapes are
 *                   accepted)
 *
 * DB_SSL_REJECT_UNAUTHORIZED=false skips verification entirely. The traffic
 * stays encrypted but the server is no longer authenticated, so it only
 * defends against passive eavesdropping and not against an impostor. Use it
 * to confirm a certificate problem, never as a permanent setting.
 */
function resolveSsl(): false | { rejectUnauthorized: boolean; ca?: string } {
  const host = process.env.DB_HOST || '';
  const url = process.env.DATABASE_URL || '';
  const isLocal =
    /^(localhost|127\.0\.0\.1|::1)$/.test(host) ||
    /@(localhost|127\.0\.0\.1)[:/]/.test(url) ||
    (!host && !url);

  // A local Postgres normally has no TLS configured at all.
  if (isLocal && process.env.DB_SSL !== 'true') return false;

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

  if (!rejectUnauthorized) {
    console.warn(
      '⚠️  DB_SSL_REJECT_UNAUTHORIZED=false: the database connection is encrypted but the ' +
        "server's certificate is not verified. Do not leave this set in production."
    );
  }

  const ca = readCaCertificate();

  return { rejectUnauthorized, ...(ca ? { ca } : {}) };
}

function readCaCertificate(): string | undefined {
  const file = process.env.DB_SSL_CA_FILE;

  if (file) {
    try {
      // Relative paths resolve against the project root, which is where the
      // process is started from.
      return fs.readFileSync(path.resolve(file), 'utf8');
    } catch (error) {
      console.error(
        `❌ DB_SSL_CA_FILE is set to "${file}" but it could not be read: ` +
          (error instanceof Error ? error.message : String(error))
      );
      // Fall through: the connection will fail with a certificate error,
      // which is clearer than silently connecting unverified.
    }
  }

  return process.env.DB_SSL_CA?.replace(/\\n/g, '\n');
}

function buildPool(): Pool {
  const connectionLimit = parseInt(
    process.env.DB_CONNECTION_LIMIT || String(DEFAULT_CONNECTION_LIMIT)
  );

  // A query that never returns holds one of very few connections. On Vercel
  // the pool is capped at 2, so two stuck queries take the whole instance
  // down and every request after them waits for a connection that is not
  // coming back. Before this there was no bound at all.
  //
  // query_timeout is the one that works here. It is enforced by node-pg in
  // this process, so it holds regardless of what sits between us and
  // PostgreSQL.
  //
  // statement_timeout is set too, but do not rely on it: Supabase's
  // transaction pooler does not pass connection parameters through, and the
  // server still reports 2min with this set to 10s — measured, not assumed.
  // It is kept because it does take effect on a direct connection, which is
  // what a local PostgreSQL or the session pooler gives you, and there it
  // cancels the query server-side rather than just abandoning it.
  const QUERY_TIMEOUT_MS = 10_000;

  const shared = {
    max: connectionLimit,
    ssl: resolveSsl(),
    // Supabase's pooler closes idle connections; do not hold them long.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: QUERY_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
  };

  // A single connection string is what Supabase hands out, so prefer it.
  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL, ...shared });
  }

  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    ...shared,
  });
}

/**
 * One pool per process, cached on globalThis.
 *
 * Without the cache, every hot reload in development creates another pool and
 * leaks its connections until the server refuses new ones.
 */
const globalForDb = globalThis as unknown as { safezonePool?: Pool };

const pool = globalForDb.safezonePool ?? buildPool();

if (!globalForDb.safezonePool) {
  globalForDb.safezonePool = pool;

  // An idle client that errors would otherwise crash the process.
  pool.on('error', (error) => {
    console.error('Idle database client error:', error.message);
  });
}

/** Describes the connection target without revealing the password. */
export function describeConnection(): string {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return `${url.pathname.replace(/^\//, '') || 'postgres'} on ${url.hostname}:${url.port || 5432}`;
    } catch {
      return 'the database named in DATABASE_URL';
    }
  }

  const host = process.env.DB_HOST || 'localhost';
  const name = process.env.DB_NAME || 'postgres';

  return `${name} on ${host}:${process.env.DB_PORT || 5432}`;
}

// ---------------------------------------------------------------------------
// Statement translation
// ---------------------------------------------------------------------------

/**
 * Rewrites `?` placeholders as PostgreSQL's `$1`, `$2`, ...
 *
 * The project was written against MySQL and uses `?` in around 200
 * statements. Translating here keeps that one convention everywhere instead
 * of having every call site carry driver-specific numbering, which is easy
 * to get wrong when a parameter is inserted in the middle of a list.
 *
 * Quoted strings, dollar-quoted blocks and comments are skipped, so a
 * literal question mark inside a string is left alone.
 */
export function toPositionalParams(sql: string): string {
  let out = '';
  let index = 0;
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];

    // Single-quoted string, with '' as the escape for a quote.
    if (char === "'") {
      const start = i;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i += 1;
          break;
        }
        i += 1;
      }
      out += sql.slice(start, i);
      continue;
    }

    // Double-quoted identifier.
    if (char === '"') {
      const start = i;
      i += 1;
      while (i < sql.length && sql[i] !== '"') i += 1;
      i += 1;
      out += sql.slice(start, i);
      continue;
    }

    // Dollar-quoted block, as used by function bodies.
    if (char === '$') {
      const match = /^\$([A-Za-z_]\w*)?\$/.exec(sql.slice(i));
      if (match) {
        const tag = match[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end === -1 ? sql.length : end + tag.length;
        out += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }

    // Line comment.
    if (char === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(i, stop);
      i = stop;
      continue;
    }

    // Block comment.
    if (char === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i);
      const stop = end === -1 ? sql.length : end + 2;
      out += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (char === '?') {
      index += 1;
      out += `$${index}`;
      i += 1;
      continue;
    }

    out += char;
    i += 1;
  }

  return out;
}

const INSERT_PATTERN = /^\s*(?:WITH[\s\S]+?)?\s*INSERT\s+(?:IGNORE\s+)?INTO/i;
const INSERT_IGNORE_PATTERN = /^(\s*)INSERT\s+IGNORE\s+INTO/i;
const RETURNING_PATTERN = /\bRETURNING\b/i;
const ON_CONFLICT_PATTERN = /\bON\s+CONFLICT\b/i;

/**
 * Converts the two MySQL insert forms this project was written against.
 *
 * `INSERT IGNORE INTO t ...` becomes `INSERT INTO t ... ON CONFLICT DO
 * NOTHING`, which has the same effect of skipping a row that would violate
 * a unique constraint. It appears in roughly twenty statements, mostly
 * seed data, and the rewrite is identical every time.
 *
 * An INSERT is then asked to hand back the new row's id. MySQL exposed it
 * as `result.insertId`, which about fifteen call sites read, but PostgreSQL
 * only returns it when the statement says RETURNING.
 *
 * Both are appended at the end, which is the correct clause order:
 *   INSERT INTO t (...) VALUES (...) ON CONFLICT DO NOTHING RETURNING id
 *
 * A statement that already says ON CONFLICT or RETURNING is left alone, so
 * a hand-written upsert keeps whatever behaviour it specified.
 */
function translateStatement(sql: string): string {
  let text = sql.replace(/;\s*$/, '');

  const isIgnore = INSERT_IGNORE_PATTERN.test(text);

  if (isIgnore) {
    text = text.replace(INSERT_IGNORE_PATTERN, '$1INSERT INTO');

    if (!ON_CONFLICT_PATTERN.test(text)) {
      text = `${text} ON CONFLICT DO NOTHING`;
    }
  }

  if (INSERT_PATTERN.test(sql) && !RETURNING_PATTERN.test(text)) {
    text = `${text} RETURNING id`;
  }

  return text;
}

/**
 * The shape call sites expect: an array of rows that also carries the two
 * MySQL result fields.
 *
 * A SELECT is used directly as an array (`rows.length`, `rows[0]`,
 * `rows.map`), while a write reads `insertId` or `affectedRows`. Attaching
 * those as hidden properties on the array satisfies both without every
 * caller having to know which kind of statement it ran.
 */
export interface QueryResult extends Array<any> {
  insertId?: number;
  affectedRows: number;
}

function shapeResult(rows: any[], rowCount: number | null, isInsert: boolean): QueryResult {
  // PostgreSQL returns lower-cased keys for unquoted identifiers; put the
  // casing the application reads back on. See lib/database-columns.ts.
  const result = rows.map(restoreRowCase) as QueryResult;

  Object.defineProperty(result, 'affectedRows', {
    value: rowCount ?? rows.length,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(result, 'insertId', {
    // Undefined when an INSERT ... ON CONFLICT DO NOTHING skipped the row.
    value: isInsert ? rows[0]?.id : undefined,
    enumerable: false,
    configurable: true,
  });

  return result;
}

// ---------------------------------------------------------------------------
// Database helper
// ---------------------------------------------------------------------------

class Database {
  /**
   * Runs a parameterised statement. Values are always sent separately from
   * the statement text, so they cannot alter it.
   */
  static async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const isInsert = INSERT_PATTERN.test(sql);
    const text = toPositionalParams(translateStatement(sql));

    try {
      const result = await pool.query(text, params);
      return shapeResult(result.rows, result.rowCount, isInsert);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Runs `callback` inside a transaction, committing on success and rolling
   * back on any error.
   *
   * The object handed to the callback exposes `execute`, returning the
   * `[rows]` tuple the existing call sites destructure.
   */
  static async transaction(callback: (connection: TransactionClient) => Promise<any>): Promise<any> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(wrapClient(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      await pool.query('SELECT 1 as test');
      console.log(`✅ Connected to ${describeConnection()}`);
      return true;
    } catch (error) {
      console.error(`❌ Could not connect to ${describeConnection()}`);
      explainConnectionError(error);
      return false;
    }
  }

  static async closePool(): Promise<void> {
    try {
      await pool.end();
      // Drop the cached reference so a later call does not reuse a pool that
      // has already been shut down.
      delete globalForDb.safezonePool;
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }

  // A previous revision carried exists/count/insert/update/delete helpers
  // that interpolated a table name and a raw SQL `condition` string. Nothing
  // ever called them. They were guarded by an identifier pattern and a
  // comment telling callers never to build a condition from request data,
  // which is exactly the kind of rule that holds until someone in a hurry
  // reaches for the convenient-looking helper. Removed rather than
  // documented harder: every call site writes its own parameterised SQL, and
  // an injection sink that does not exist cannot be misused.

}

// ---------------------------------------------------------------------------
// Transaction client
// ---------------------------------------------------------------------------

export interface TransactionClient {
  /** Returns `[rows]`, matching what the call sites destructure. */
  execute(sql: string, params?: any[]): Promise<[QueryResult, any[]]>;
  query(sql: string, params?: any[]): Promise<QueryResult>;
}

function wrapClient(client: PoolClient): TransactionClient {
  const run = async (sql: string, params: any[] = []): Promise<QueryResult> => {
    const isInsert = INSERT_PATTERN.test(sql);
    const text = toPositionalParams(translateStatement(sql));
    const result = await client.query(text, params);

    return shapeResult(result.rows, result.rowCount, isInsert);
  };

  return {
    query: run,
    execute: async (sql: string, params: any[] = []) => [await run(sql, params), []],
  };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Connection failures are almost always one of a few configuration
 * mistakes. Naming the likely cause saves a lot of guessing.
 */
function explainConnectionError(error: unknown): void {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);

  console.error(`   ${code ? `${code}: ` : ''}${message}`);
  console.error('');

  if (code === 'ECONNREFUSED') {
    console.error('   Nothing is listening there. Check the host and port, and that you are');
    console.error("   using Supabase's pooler address rather than a direct connection.");
  } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    console.error('   That hostname does not resolve. Check it for typos.');
  } else if (code === 'ETIMEDOUT') {
    console.error('   The host did not respond. Check network access and any IP allow list.');
  } else if (code === '28P01' || /password authentication failed/i.test(message)) {
    console.error('   The server was reached but rejected the credentials. Check the password,');
    console.error('   and that the username includes the project reference if your pooler');
    console.error('   requires it.');
  } else if (code === '3D000' || /does not exist/i.test(message)) {
    console.error('   The server was reached but has no database of that name.');
  } else if (/self.signed|certificate|unable to verify/i.test(message)) {
    console.error("   TLS failed to verify the server's certificate. Supply the provider's CA");
    console.error('   certificate in DB_SSL_CA.');
  } else if (/no pg_hba\.conf entry|SSL/i.test(message)) {
    console.error('   The server requires an encrypted connection. Set DB_SSL=true, or add');
    console.error('   ?sslmode=require to DATABASE_URL.');
  }

  console.error('');
}

export { Database, pool };
