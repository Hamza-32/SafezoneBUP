export const dynamic = 'force-dynamic';

// Emergency contacts API - /api/contacts
//
// Reads are public: the campus hotline numbers must be reachable by someone
// who is not signed in, including during an emergency. Writes are
// administrator-only, because these are the numbers the whole platform
// displays and tells people to call.
import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  requireAdmin,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { parseBody, createContactSchema, updateContactSchema } from '@/lib/validation';

export async function GET() {
  try {
    const contacts = await Database.query(
      `SELECT id, name, phoneNumber, email, department, displayOrder
       FROM emergency_contacts
       WHERE isActive = TRUE
       ORDER BY displayOrder, name`
    );

    return successResponse(contacts);
  } catch (error) {
    return serverErrorResponse(
      'Error fetching emergency contacts',
      error,
      'Failed to fetch emergency contacts'
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const parsed = await parseBody(request, createContactSchema);
    if (!parsed.ok) return parsed.response;

    const { name, phoneNumber, email, department, displayOrder } = parsed.data;

    const result = await Database.query(
      `INSERT INTO emergency_contacts (name, phoneNumber, email, department, displayOrder)
       VALUES (?, ?, ?, ?, ?)`,
      [name, phoneNumber, email || null, department || null, displayOrder ?? 0]
    );

    await logAction(
      auth.user.id,
      'CREATE_EMERGENCY_CONTACT',
      'emergency_contacts',
      result.insertId,
      { name, phoneNumber },
      request
    );

    return successResponse(
      { id: result.insertId, name, phoneNumber, email, department },
      'Emergency contact created',
      201
    );
  } catch (error) {
    return serverErrorResponse(
      'Error creating emergency contact',
      error,
      'Failed to create emergency contact'
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const parsed = await parseBody(request, updateContactSchema);
    if (!parsed.ok) return parsed.response;

    const { id, ...changes } = parsed.data;

    const existing = await Database.query(
      'SELECT id, name, phoneNumber, email, department, isActive, displayOrder FROM emergency_contacts WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return errorResponse('Emergency contact not found', 404);
    }

    // Build the update from only the fields that were supplied, so a partial
    // edit cannot blank out the phone number by omitting it. Column names
    // come from this fixed list, never from the request.
    const updatable = [
      'name',
      'phoneNumber',
      'email',
      'department',
      'isActive',
      'displayOrder',
    ] as const;

    const setClauses: string[] = [];
    const values: any[] = [];

    for (const column of updatable) {
      const value = (changes as Record<string, unknown>)[column];
      if (value !== undefined) {
        setClauses.push(`${column} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    values.push(id);

    await Database.query(
      `UPDATE emergency_contacts SET ${setClauses.join(', ')}, updatedAt = NOW() WHERE id = ?`,
      values
    );

    await logAction(
      auth.user.id,
      'UPDATE_EMERGENCY_CONTACT',
      'emergency_contacts',
      id,
      { before: existing[0], changes },
      request
    );

    return successResponse({ id }, 'Emergency contact updated');
  } catch (error) {
    return serverErrorResponse(
      'Error updating emergency contact',
      error,
      'Failed to update emergency contact'
    );
  }
}
