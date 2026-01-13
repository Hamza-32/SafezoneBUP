import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

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

// Database configuration
const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'safezone_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

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

  // Helper method to check if a record exists
  static async exists(table: string, condition: string, params: any[] = []): Promise<boolean> {
    const sql = `SELECT 1 FROM ${table} WHERE ${condition} LIMIT 1`;
    const result = await this.findOne(sql, params);
    return !!result;
  }

  // Helper method to get record count
  static async count(table: string, condition: string = '1=1', params: any[] = []): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`;
    const result = await this.findOne(sql, params);
    return result ? result.count : 0;
  }

  // Helper method for inserting and getting the inserted ID
  static async insert(table: string, data: Record<string, any>): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);
    
    return result.insertId;
  }

  // Helper method for updating records
  static async update(table: string, data: Record<string, any>, condition: string, params: any[] = []): Promise<number> {
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...params];
    
    const sql = `UPDATE ${table} SET ${updates} WHERE ${condition}`;
    const result = await this.query(sql, values);
    
    return result.affectedRows;
  }

  // Helper method for deleting records
  static async delete(table: string, condition: string, params: any[] = []): Promise<number> {
    const sql = `DELETE FROM ${table} WHERE ${condition}`;
    const result = await this.query(sql, params);
    
    return result.affectedRows;
  }
}

export { Database, pool };
