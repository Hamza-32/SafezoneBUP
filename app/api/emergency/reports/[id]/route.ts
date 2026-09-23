export const dynamic = 'force-dynamic';

// Triage a single emergency report - PATCH /api/emergency/reports/[id]
//
// The dashboard had View, Edit, Assign Staff, Mark as Resolved and Add Note
// controls and no endpoint behind any of them, so a responder could read what
// had come in and nothing else. This is that endpoint.
//
// Only the triage state is writable. A report's title, description, location
// and category are the reporter's account of what happened, and are not
// staff's to rewrite.

import { NextRequest } from 'next/server';
import { Database } from '@/lib/database';
import {
  withStaff,
  logAction,
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-middleware';
import { parseBody, updateReportSchema } from '@/lib/validation';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withStaff(request, async (req: NextRequest, user: any) => {
    const reportId = Number(params.id);

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return errorResponse('Invalid report id', 400);
    }

    const parsed = await parseBody(request, updateReportSchema);
    if (!parsed.ok) return parsed.response;

    const { status, assignedTo, adminNotes } = parsed.data;

    try {
      const [existing] = await Database.query(
        'SELECT id, status, assignedTo FROM emergency_reports WHERE id = ?',
        [reportId]
      );

      if (!existing) {
        return errorResponse('Report not found', 404);
      }

      // A report parked on a student would look assigned and be actionable by
      // nobody, so the target has to be someone who can actually respond.
      if (assignedTo !== undefined && assignedTo !== null) {
        const [assignee] = await Database.query(
          "SELECT id FROM users WHERE id = ? AND role IN ('admin', 'security')",
          [assignedTo]
        );

        if (!assignee) {
          return errorResponse('Reports can only be assigned to staff', 400);
        }
      }

      const updates: string[] = [];
      const values: unknown[] = [];

      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }

      if (assignedTo !== undefined) {
        updates.push('assignedTo = ?');
        values.push(assignedTo);
      }

      if (adminNotes !== undefined) {
        updates.push('adminNotes = ?');
        values.push(adminNotes);
      }

      updates.push('updatedAt = NOW()');
      values.push(reportId);

      await Database.query(
        `UPDATE emergency_reports SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Who changed what, on a record that may matter later. The previous
      // values go in too, so the log answers "what did it say before".
      await logAction(
        user.id,
        'TRIAGE_EMERGENCY_REPORT',
        'emergency_reports',
        reportId,
        {
          from: { status: existing.status, assignedTo: existing.assignedTo },
          to: { status, assignedTo, adminNotes: adminNotes === undefined ? undefined : '(set)' },
        },
        request
      );

      const [updated] = await Database.query(
        `SELECT er.id, er.referenceId, er.title, er.status, er.priority,
                er.assignedTo, er.adminNotes, er.updatedAt,
                assigned_admin.firstName AS assignedAdminFirstName,
                assigned_admin.lastName  AS assignedAdminLastName
           FROM emergency_reports er
           LEFT JOIN users assigned_admin ON er.assignedTo = assigned_admin.id
          WHERE er.id = ?`,
        [reportId]
      );

      const { assignedAdminFirstName, assignedAdminLastName, ...report } = updated;

      return successResponse(
        {
          ...report,
          assignedAdminName:
            assignedAdminFirstName && assignedAdminLastName
              ? `${assignedAdminFirstName} ${assignedAdminLastName}`
              : null,
        },
        'Report updated'
      );
    } catch (error) {
      return serverErrorResponse('Triage emergency report', error, 'Could not update the report');
    }
  });
}
