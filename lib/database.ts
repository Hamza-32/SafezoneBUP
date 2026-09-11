import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

// Database configuration interface
interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

/**
 * Connections per pool.
 *
 * On a serverless host such as Vercel every concurrent function instance
 * builds its own pool, so the real connection count is this number times the
 * number of live instances. MySQL will start refusing connections once that
 * exceeds max_connections, which surfaces as intermittent 500s under load.
 * Keep this small in serverless and raise it only on a long-lived server.
 */
const DEFAULT_CONNECTION_LIMIT = process.env.VERCEL ? 2 : 10;

// Database configuration
const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'safezone_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || String(DEFAULT_CONNECTION_LIMIT)),
  queueLimit: 0,
};

/**
 * One pool per process, cached on globalThis.
 *
 * Without the cache, every hot reload in development and every module
 * re-evaluation creates another pool and leaks its connections until the
 * database refuses new ones.
 */
const globalForDb = globalThis as unknown as { safezonePool?: mysql.Pool };

const pool = globalForDb.safezonePool ?? mysql.createPool(dbConfig);

if (!globalForDb.safezonePool) {
  globalForDb.safezonePool = pool;
}

// Database connection helper
class Database {
  static async query(sql: string, params: any[] = []): Promise<any> {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  static async transaction(callback: (connection: mysql.PoolConnection) => Promise<any>): Promise<any> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  static async testConnection(): Promise<boolean> {
    try {
      const [results] = await pool.execute('SELECT 1 as test');
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  static async closePool(): Promise<void> {
    try {
      await pool.end();
      // Drop the cached reference so a later call does not reuse a pool
      // that has already been shut down.
      delete globalForDb.safezonePool;
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }

  // Helper method to get a single record
  static async findOne(sql: string, params: any[] = []): Promise<any> {
    const results = await this.query(sql, params);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  }

  // The helpers below interpolate table and column names directly, because
  // SQL placeholders cannot stand in for an identifier. Identifiers are
  // therefore checked against a strict pattern first.
  //
  // The `condition` argument is a raw SQL fragment. It must always be a
  // string literal written in the calling code, with every value passed
  // through `params`. Never build a condition from request data.

  private static assertIdentifier(name: string, kind: string): void {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Unsafe ${kind} name: ${JSON.stringify(name)}`);
    }
  }

  // Helper method to check if a record exists
  static async exists(table: string, condition: string, params: any[] = []): Promise<boolean> {
    this.assertIdentifier(table, 'table');

    const sql = `SELECT 1 FROM ${table} WHERE ${condition} LIMIT 1`;
    const result = await this.findOne(sql, params);
    return !!result;
  }

  // Helper method to get record count
  static async count(table: string, condition: string = '1=1', params: any[] = []): Promise<number> {
    this.assertIdentifier(table, 'table');

    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`;
    const result = await this.findOne(sql, params);
    return result ? result.count : 0;
  }

  // Helper method for inserting and getting the inserted ID
  static async insert(table: string, data: Record<string, any>): Promise<number> {
    this.assertIdentifier(table, 'table');

    const columns = Object.keys(data);
    columns.forEach(column => this.assertIdentifier(column, 'column'));

    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);

    return result.insertId;
  }

  // Helper method for updating records
  static async update(table: string, data: Record<string, any>, condition: string, params: any[] = []): Promise<number> {
    this.assertIdentifier(table, 'table');

    const columns = Object.keys(data);
    columns.forEach(column => this.assertIdentifier(column, 'column'));

    const updates = columns.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...params];

    const sql = `UPDATE ${table} SET ${updates} WHERE ${condition}`;
    const result = await this.query(sql, values);

    return result.affectedRows;
  }

  // Helper method for deleting records
  static async delete(table: string, condition: string, params: any[] = []): Promise<number> {
    this.assertIdentifier(table, 'table');

    const sql = `DELETE FROM ${table} WHERE ${condition}`;
    const result = await this.query(sql, params);

    return result.affectedRows;
  }
}

export { Database, pool };
