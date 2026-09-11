/**
 * Column name casing.
 *
 * PostgreSQL folds unquoted identifiers to lower case. So `CREATE TABLE
 * users (firstName ...)` actually creates a column called `firstname`, and a
 * query for it returns `{ firstname: 'Ada' }`.
 *
 * Queries themselves are unaffected, because the folding applies to the
 * query text too: `SELECT firstName` resolves to the same column. Only the
 * keys on the returned rows differ, and the application reads them as
 * `user.firstName` in hundreds of places.
 *
 * Rather than quote every identifier in every statement, or rename the whole
 * schema to snake_case and rewrite every property read, the data layer maps
 * the returned keys back to the casing the application expects. This file is
 * the single list those mappings come from.
 *
 * Adding a camelCase column or alias means adding it here. That is enforced:
 * `npm run verify:security` scans the schema and the SELECT aliases and
 * fails if anything is missing, so a forgotten name cannot silently arrive
 * as lower case and read as undefined.
 */

/** Every camelCase column name in the schema, plus SELECT aliases. */
export const CAMEL_CASE_COLUMNS = [
  // users
  'firstName',
  'lastName',
  'studentId',
  'phoneNumber',
  'isVerified',
  'profileImage',
  'createdAt',
  'updatedAt',

  // emergency_reports and complaints
  'referenceId',
  'userId',
  'isAnonymous',
  'adminNotes',
  'adminResponse',

  // notifications
  'isRead',
  'relatedId',
  'relatedType',

  // audit_logs
  'tableName',
  'recordId',
  'oldValues',
  'newValues',
  'ipAddress',
  'userAgent',

  // system_settings
  'settingKey',
  'settingValue',
  'isPublic',

  // emergency_contacts
  'displayOrder',
  'isActive',

  // safety_resources
  'contactInfo',
  'createdBy',

  // discussion_categories
  'requiresModeration',

  // discussion_posts and discussion_comments
  'categoryId',
  'authorId',
  'moderatedBy',
  'moderatedAt',
  'moderationNote',
  'reportCount',
  'postId',
  'parentId',

  // discussion_votes and discussion_reports
  'targetType',
  'targetId',
  'voteType',
  'reporterId',
  'reviewedBy',
  'reviewedAt',

  // safety_checkins
  'checkinTime',
  'expectedArrivalTime',
  'sosTriggered',
  'emergencyContactId',

  // badges and points
  'badgeId',
  'awardedAt',
  'lastUpdated',

  // user_verifications
  'submittedAt',
  'verifiedAt',
  'rejectedAt',
  'rejectionReason',
  'documentUrl',

  // trusted_reporters
  'credibilityScore',
  'grantedAt',
  'revokedAt',

  // lost_and_found
  'dateReported',
  'dateLostFound',
  'imageUrl',
  'resolvedBy',
  'resolvedAt',
  'expiresAt',

  // schema_migrations
  'appliedAt',

  // aliases introduced by SELECT statements
  'emergencyContactName',
  'userEmail',
  'authorEmail',
  'categoryName',
  'categoryColor',
  'authorName',
  'commentCount',
  'postCount',
  'totalCount',
  'reporterName',
  'responseTime',
  'postTitle',
  'contentPreview',
  'assignedAdminFirstName',
  'assignedAdminLastName',
] as const;

/** lower case as PostgreSQL returns it, mapped to the casing the app uses. */
export const COLUMN_CASE_MAP: Record<string, string> = Object.fromEntries(
  CAMEL_CASE_COLUMNS.map((name) => [name.toLowerCase(), name])
);

/**
 * Restores the expected casing on one row.
 *
 * Returns the row unchanged when nothing needs renaming, which is the common
 * case for aggregate queries and keeps the allocation off the hot path.
 */
export function restoreRowCase(row: Record<string, any>): Record<string, any> {
  let needsMapping = false;

  for (const key in row) {
    if (COLUMN_CASE_MAP[key] !== undefined && COLUMN_CASE_MAP[key] !== key) {
      needsMapping = true;
      break;
    }
  }

  if (!needsMapping) return row;

  const mapped: Record<string, any> = {};

  for (const key in row) {
    mapped[COLUMN_CASE_MAP[key] ?? key] = row[key];
  }

  return mapped;
}
