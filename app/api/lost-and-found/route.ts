export const dynamic = 'force-dynamic';

// Lost and found API - /api/lost-and-found
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  requireAuth,
  optionalUser,
  canActOnRecord,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
  type AuthenticatedUser,
} from '@/lib/api-middleware';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  parseBody,
  createLostFoundSchema,
  updateLostFoundSchema,
  LOST_FOUND_CATEGORIES,
} from '@/lib/validation';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/**
 * Decide what of an item is safe to show to this viewer.
 *
 * Contact details are only released to signed-in users. The listing itself
 * is public so someone can search for a lost item before creating an
 * account, but leaving phone numbers and email addresses on an open endpoint
 * would make the board trivially scrapeable.
 */
function presentItem(item: any, viewer: AuthenticatedUser | null) {
  const contactInfo =
    typeof item.contactInfo === 'string' ? safeParseJson(item.contactInfo) : item.contactInfo;

  const isOwnerOrStaff = viewer ? canActOnRecord(viewer, item.userId) : false;
  const hideIdentity = Boolean(item.isAnonymous) && !isOwnerOrStaff;

  return {
    ...item,
    // Never ship the poster's internal user id to other viewers.
    userId: isOwnerOrStaff ? item.userId : undefined,
    firstName: hideIdentity ? null : item.firstName,
    lastName: hideIdentity ? null : item.lastName,
    userEmail: hideIdentity || !viewer ? null : item.userEmail,
    contactInfo: viewer && !hideIdentity ? contactInfo : null,
    contactAvailable: Boolean(contactInfo && Object.keys(contactInfo).length > 0),
  };
}

function safeParseJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const viewer = await optionalUser(request);
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search');

    // Validate every filter against a fixed set before it reaches the query.
    if (type && !['lost', 'found'].includes(type)) {
      return errorResponse('Invalid type filter', 400);
    }

    if (category && !LOST_FOUND_CATEGORIES.includes(category as any)) {
      return errorResponse('Invalid category filter', 400);
    }

    if (!['active', 'resolved', 'expired'].includes(status)) {
      return errorResponse('Invalid status filter', 400);
    }

    const requestedLimit = Number(searchParams.get('limit') || DEFAULT_PAGE_SIZE);
    const requestedOffset = Number(searchParams.get('offset') || 0);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const offset = Number.isFinite(requestedOffset) ? Math.max(Math.trunc(requestedOffset), 0) : 0;

    let query = `
      SELECT lf.id, lf.userId, lf.type, lf.title, lf.description, lf.category,
             lf.location, lf.dateReported, lf.dateLostFound, lf.imageUrl,
             lf.contactInfo, lf.status, lf.isAnonymous, lf.createdAt,
             u.firstName, u.lastName, u.email as userEmail
      FROM lost_and_found lf
      LEFT JOIN users u ON lf.userId = u.id
      WHERE lf.status = ?
    `;
    const params: any[] = [status];

    if (type) {
      query += ' AND lf.type = ?';
      params.push(type);
    }

    if (category) {
      query += ' AND lf.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (lf.title ILIKE ? OR lf.description ILIKE ? OR lf.location ILIKE ?)';
      // Escape LIKE wildcards so a search for "100%" is a literal search.
      const searchTerm = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // limit and offset are clamped integers, never raw input.
    query += ` ORDER BY lf.createdAt DESC LIMIT ${limit} OFFSET ${offset}`;

    const items = await Database.query(query, params);

    return successResponse(items.map((item: any) => presentItem(item, viewer)));
  } catch (error) {
    return serverErrorResponse(
      'Error fetching lost and found items',
      error,
      'Failed to fetch lost and found items'
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const limited = await enforceRateLimit(request, 'lost-found-create', 15, 60 * 60);
  if (limited) return limited;

  try {
    const parsed = await parseBody(request, createLostFoundSchema);
    if (!parsed.ok) return parsed.response;

    const {
      type,
      title,
      description,
      category,
      location,
      dateLostFound,
      imageUrl,
      contactInfo,
      isAnonymous,
    } = parsed.data;

    // Items expire 30 days after they are posted.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const result = await Database.query(
      `INSERT INTO lost_and_found
       (userId, type, title, description, category, location, dateReported, dateLostFound,
        imageUrl, contactInfo, isAnonymous, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?)`,
      [
        // Taken from the session, so a client cannot post as another user.
        auth.user.id,
        type,
        title,
        description,
        category,
        location || null,
        dateLostFound || null,
        imageUrl || null,
        JSON.stringify(contactInfo || {}),
        Boolean(isAnonymous),
        expiresAt,
      ]
    );

    await logAction(
      auth.user.id,
      'CREATE_LOST_FOUND',
      'lost_and_found',
      result.insertId,
      { type, category },
      request
    );

    return successResponse(
      {
        id: result.insertId,
        type,
        title,
        description,
        category,
        location,
        dateLostFound,
        imageUrl,
        contactInfo,
        isAnonymous: Boolean(isAnonymous),
        status: 'active',
      },
      'Item posted',
      201
    );
  } catch (error) {
    return serverErrorResponse(
      'Error creating lost and found item',
      error,
      'Failed to create lost and found item'
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const parsed = await parseBody(request, updateLostFoundSchema);
    if (!parsed.ok) return parsed.response;

    const { id, status } = parsed.data;

    const existing = await Database.query(
      'SELECT id, userId, status FROM lost_and_found WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return errorResponse('Item not found', 404);
    }

    // Only the person who posted the item, or staff, may close it out.
    if (!canActOnRecord(auth.user, existing[0].userId)) {
      return errorResponse('Access denied', 403);
    }

    if (status === 'resolved') {
      // resolvedBy comes from the session, never from the request body.
      await Database.query(
        `UPDATE lost_and_found
         SET status = ?, resolvedBy = ?, resolvedAt = NOW(), updatedAt = NOW()
         WHERE id = ?`,
        [status, auth.user.id, id]
      );
    } else {
      await Database.query(
        'UPDATE lost_and_found SET status = ?, resolvedBy = NULL, resolvedAt = NULL, updatedAt = NOW() WHERE id = ?',
        [status, id]
      );
    }

    await logAction(
      auth.user.id,
      'UPDATE_LOST_FOUND',
      'lost_and_found',
      id,
      { from: existing[0].status, to: status },
      request
    );

    return successResponse({ id, status }, 'Item updated');
  } catch (error) {
    return serverErrorResponse(
      'Error updating lost and found item',
      error,
      'Failed to update lost and found item'
    );
  }
}
