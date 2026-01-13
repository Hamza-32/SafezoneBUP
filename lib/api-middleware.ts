// Next.js middleware utilities for authentication and authorization
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Database } from './database';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'safezone-jwt-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token and get user
export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Get user from database
    const users = await Database.query(
      'SELECT id, email, firstName, lastName, studentId, phoneNumber, role, isVerified FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    return users[0];
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Authentication middleware for API routes
export async function withAuth(request: NextRequest, handler: Function) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Access denied. No token provided.' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = await verifyToken(token);
    
    // Add user to request context
    return await handler(request, user);
    
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

// Admin middleware - requires authentication first
export async function withAdmin(request: NextRequest, handler: Function) {
  return withAuth(request, async (req: NextRequest, user: any) => {
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
    }
    
    return await handler(req, user);
  });
}

// Optional authentication middleware - doesn't fail if no token
export async function withOptionalAuth(request: NextRequest, handler: Function) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return await handler(request, null);
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    
    return await handler(request, user);
    
  } catch (error) {
    // Continue without user if token is invalid
    return await handler(request, null);
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Validate required fields
export function validateRequiredFields(data: any, requiredFields: string[]): string[] {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  return missing;
}

// Sanitize input data
export function sanitizeInput(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Generate reference ID
export function generateReferenceId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

// Log user actions (audit trail)
export async function logAction(
  userId: number | null,
  action: string,
  tableName: string,
  recordId: number,
  data: any = {},
  request: NextRequest
) {
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await Database.query(
      `INSERT INTO audit_logs (userId, action, tableName, recordId, newValues, ipAddress, userAgent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, tableName, recordId, JSON.stringify(data), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Failed to log action:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

// API response helpers
export function successResponse(data: any, message?: string, status: number = 200) {
  const response: any = { success: true };
  if (message) response.message = message;
  if (data) response.data = data;
  
  return NextResponse.json(response, { status });
}

export function errorResponse(error: string, status: number = 400, details?: any) {
  const response: any = { success: false, error };
  if (details) response.details = details;
  
  return NextResponse.json(response, { status });
}
