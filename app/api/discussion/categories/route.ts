export const dynamic = 'force-dynamic';

// Discussion categories API - /api/discussion/categories
//
// This is the only categories endpoint. A second, unguarded copy used to
// exist at /api/discussions; it was removed because it allowed anonymous
// callers to create categories that then appeared to every student.
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  requireAdmin,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { parseBody, createCategorySchema } from '@/lib/validation';

export async function GET() {
  try {
    const categories = await Database.query(
      `SELECT id, name, description, color, isActive
       FROM discussion_categories
       WHERE isActive = TRUE
       ORDER BY name`
    );

    return successResponse(categories);
  } catch (error) {
    return serverErrorResponse(
      'Error fetching discussion categories',
      error,
      'Failed to fetch discussion categories'
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const parsed = await parseBody(request, createCategorySchema);
    if (!parsed.ok) return parsed.response;

    const { name, description, color } = parsed.data;

    const existing = await Database.query(
      'SELECT id FROM discussion_categories WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      return errorResponse('A category with this name already exists', 409);
    }

    const result = await Database.query(
      'INSERT INTO discussion_categories (name, description, color) VALUES (?, ?, ?)',
      [name, description || null, color || '#3B82F6']
    );

    await logAction(
      auth.user.id,
      'CREATE_DISCUSSION_CATEGORY',
      'discussion_categories',
      result.insertId,
      { name },
      request
    );

    return successResponse(
      { id: result.insertId, name, description, color: color || '#3B82F6' },
      'Category created',
      201
    );
  } catch (error) {
    return serverErrorResponse(
      'Error creating discussion category',
      error,
      'Failed to create discussion category'
    );
  }
}
