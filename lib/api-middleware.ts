// Authentication, authorization and response helpers for API routes.
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Database } from './database';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Dev-only signing key. It exists so a fresh clone runs without setup, and it
 * is unreachable in production: resolveJwtSecret() throws instead of falling
 * back once NODE_ENV is 'production'. Never rely on this value.
 */
const DEV_ONLY_SECRET = 'insecure-development-only-key-do-not-use-in-production';

const MIN_SECRET_LENGTH = 32;

let warnedAboutDevSecret = false;

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (secret && secret.length >= MIN_SECRET_LENGTH) {
    return secret;
  }

  if (isProduction) {
    throw new Error(
      `JWT_SECRET is missing or too short. Set it to a random string of at least ${MIN_SECRET_LENGTH} characters, ` +
        'for example the output of: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }

  if (!warnedAboutDevSecret) {
    warnedAboutDevSecret = true;
    console.warn(
      secret
        ? `⚠️  JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters. Using the development key instead. This will refuse to start in production.`
        : '⚠️  JWT_SECRET is not set. Using an insecure development key. Set JWT_SECRET before deploying.'
    );
  }

  return DEV_ONLY_SECRET;
}

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

/** Name of the httpOnly session cookie. */
export const AUTH_COOKIE_NAME = 'safezone-token';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Roles that exist in the system, in ascending order of privilege. */
export type UserRole = 'student' | 'security' | 'admin';

export interface AuthenticatedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  phoneNumber: string | null;
  role: UserRole;
  isVerified: boolean;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, resolveJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a token and load the current user record.
 *
 * The user is always re-read from the database rather than trusted from the
 * token payload, so a role change or a deleted account takes effect on the
 * next request instead of when the token finally expires.
 */
export async function verifyToken(token: string): Promise<AuthenticatedUser> {
  const decoded = jwt.verify(token, resolveJwtSecret()) as { userId?: unknown };

  if (typeof decoded.userId !== 'number') {
    throw new Error('Invalid token payload');
  }

  const users = await Database.query(
    'SELECT id, email, firstName, lastName, studentId, phoneNumber, role, isVerified FROM users WHERE id = ?',
    [decoded.userId]
  );

  if (users.length === 0) {
    throw new Error('User not found');
  }

  return users[0] as AuthenticatedUser;
}

/**
 * Read the bearer token from the request.
 *
 * The httpOnly cookie is preferred because it is not reachable from
 * JavaScript, which means an injected script cannot read the session. The
 * Authorization header is still accepted so that API clients and existing
 * integrations keep working.
 */
function extractToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Session cookie
// ---------------------------------------------------------------------------

export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}

// ---------------------------------------------------------------------------
// Cross-site request forgery
// ---------------------------------------------------------------------------

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Reject state-changing requests that were initiated by another site.
 *
 * SameSite=lax on the session cookie already stops the common cases. This is
 * a second check for browsers or proxies that do not honour it: if an Origin
 * or Referer header is present it must match the host serving the request.
 */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(request.method)) return null;

  const host = request.headers.get('host');
  const source = request.headers.get('origin') || request.headers.get('referer');

  // No Origin/Referer means a non-browser client, which cannot be tricked by
  // a cross-site form post. Those requests authenticate with a bearer header.
  if (!source || !host) return null;

  try {
    if (new URL(source).host === host) return null;
  } catch {
    // Unparseable Origin, fall through to the rejection below.
  }

  return NextResponse.json(
    { success: false, error: 'Cross-origin request rejected' },
    { status: 403 }
  );
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

// The `?: never` members keep this usable as a discriminated union even
// though the project compiles with `strict: false`, where narrowing on a
// boolean discriminant alone does not remove the other branch.
export type AuthResult =
  | { ok: true; user: AuthenticatedUser; response?: never }
  | { ok: false; user?: never; response: NextResponse };

const UNAUTHENTICATED = () =>
  NextResponse.json(
    { success: false, error: 'Authentication required' },
    { status: 401 }
  );

/**
 * Require a signed-in user.
 *
 * Usage:
 *   const auth = await requireAuth(request);
 *   if (!auth.ok) return auth.response;
 *   // auth.user is now available
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const originError = assertSameOrigin(request);
  if (originError) return { ok: false, response: originError };

  const token = extractToken(request);
  if (!token) return { ok: false, response: UNAUTHENTICATED() };

  try {
    const user = await verifyToken(token);
    return { ok: true, user };
  } catch {
    // Clear the cookie so a stale or tampered session stops being resent.
    const response = UNAUTHENTICATED();
    clearAuthCookie(response);
    return { ok: false, response };
  }
}

/** Require a signed-in user holding one of `roles`. */
export async function requireRole(
  request: NextRequest,
  ...roles: UserRole[]
): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  if (!roles.includes(auth.user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Access denied. Insufficient privileges.' },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/** Require an administrator. */
export function requireAdmin(request: NextRequest): Promise<AuthResult> {
  return requireRole(request, 'admin');
}

/** Require staff: an administrator or a member of campus security. */
export function requireStaff(request: NextRequest): Promise<AuthResult> {
  return requireRole(request, 'admin', 'security');
}

/**
 * Resolve the user if a valid session is present, otherwise null.
 * Used by endpoints that accept anonymous submissions.
 */
export async function optionalUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = extractToken(request);
  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * True when `user` may act on a record owned by `ownerId`.
 * Staff may act on any record; everyone else only on their own.
 */
export function canActOnRecord(user: AuthenticatedUser, ownerId: number | null): boolean {
  if (user.role === 'admin' || user.role === 'security') return true;
  return ownerId !== null && ownerId === user.id;
}

// ---------------------------------------------------------------------------
// Callback-style wrappers (kept for existing routes)
// ---------------------------------------------------------------------------

export async function withAuth(request: NextRequest, handler: Function) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  return handler(request, auth.user);
}

export async function withAdmin(request: NextRequest, handler: Function) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  return handler(request, auth.user);
}

export async function withStaff(request: NextRequest, handler: Function) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  return handler(request, auth.user);
}

export async function withOptionalAuth(request: NextRequest, handler: Function) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const user = await optionalUser(request);
  return handler(request, user);
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

// 12 rounds is the current sensible default: meaningfully slower to attack
// offline than 10, still a few hundred milliseconds per hash.
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let decoyHash: string | null = null;

/**
 * Spend roughly the same time as a real password check when the account does
 * not exist. Without this, a failed lookup returns much faster than a wrong
 * password, which tells an attacker which email addresses are registered.
 *
 * The decoy hash is generated once from a random value, so no fixed hash is
 * committed and the comparison can never accidentally succeed.
 */
export async function burnPasswordComparison(password: string): Promise<void> {
  try {
    if (!decoyHash) {
      decoyHash = await bcrypt.hash(
        `decoy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        BCRYPT_ROUNDS
      );
    }

    await bcrypt.compare(password, decoyHash);
  } catch {
    // Timing equalisation is best-effort and must never fail a request.
  }
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/**
 * Legacy field checker. Prefer a zod schema from lib/validation.ts for new
 * code: this only tests for presence, not type, shape or length.
 */
export function validateRequiredFields(data: any, requiredFields: string[]): string[] {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }

  return missing;
}

/** Legacy whitespace trimmer. zod schemas trim on their own. */
export function sanitizeInput(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = typeof value === 'string' ? value.trim() : value;
  }

  return sanitized;
}

export function generateReferenceId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/** Records an entry in the audit trail. Never throws. */
export async function logAction(
  userId: number | null,
  action: string,
  tableName: string,
  recordId: number | null,
  data: any = {},
  request: NextRequest
) {
  try {
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
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
    // Logging failure must not break the operation being logged.
  }
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

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

/**
 * Log the real error server-side and return a generic message to the client.
 * Internal errors, stack traces and database messages must never reach a
 * response body.
 */
export function serverErrorResponse(context: string, error: unknown, clientMessage: string) {
  console.error(`${context}:`, error);
  return errorResponse(clientMessage, 500);
}
