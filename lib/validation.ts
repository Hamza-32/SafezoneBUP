// Request body validation schemas.
//
// Every route that accepts a body should parse it through one of these
// schemas rather than destructuring req.json() directly. zod strips unknown
// keys by default, which is what stops clients from smuggling extra fields
// (such as `role` or `userId`) into a handler.

import { z } from 'zod';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(255)
  .email('Invalid email format');

/**
 * Password policy for new and changed passwords. Ten characters with mixed
 * character classes is the floor for accounts that can read other people's
 * incident reports.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .max(200, 'Password is too long')
  .refine((value) => /[a-z]/.test(value), {
    message: 'Password must contain a lowercase letter',
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: 'Password must contain an uppercase letter',
  })
  .refine((value) => /[0-9]/.test(value), {
    message: 'Password must contain a number',
  });

export const phoneSchema = z
  .string()
  .trim()
  .min(6)
  .max(20)
  .regex(/^[+0-9()\-\s]+$/, 'Invalid phone number');

/**
 * Accepts only http(s) URLs or same-origin relative paths.
 *
 * This blocks the `javascript:` and `data:` URLs that would otherwise reach
 * an <img src> or an anchor href in the client and execute as script.
 */
// Capped at 500 to match the imageUrl column width in the schema.
export const safeUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => {
      if (value.startsWith('/') && !value.startsWith('//')) return true;
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Image URL must be an http(s) URL or a relative path' }
  );

export const idSchema = z.coerce.number().int().positive();

const contactInfoSchema = z
  .object({
    email: emailSchema.optional().or(z.literal('')),
    phone: phoneSchema.optional().or(z.literal('')),
    preferredContact: z.enum(['email', 'phone']).optional(),
  })
  .strip();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Public self-registration. `role` is deliberately absent: the handler always
 * assigns 'student'. Privileged accounts are created through the
 * admin-authenticated path, never by the person signing up.
 */
export const registerSchema = z.object({
  firstName: trimmedString(1, 100),
  lastName: trimmedString(1, 100),
  email: emailSchema,
  password: passwordSchema,
  studentId: trimmedString(1, 50).optional(),
  phoneNumber: phoneSchema.optional(),
});

/** Registration performed by an authenticated admin, which may set a role. */
export const adminCreateUserSchema = registerSchema.extend({
  role: z.enum(['student', 'admin', 'security']),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: trimmedString(1, 100).optional(),
  lastName: trimmedString(1, 100).optional(),
  phoneNumber: phoneSchema.optional(),
  studentId: trimmedString(1, 50).optional(),
});

// ---------------------------------------------------------------------------
// Safety check-in
// ---------------------------------------------------------------------------

export const CHECKIN_STATUSES = ['pending', 'arrived', 'missed', 'alerted'] as const;

/** `userId` is absent by design: the handler takes it from the session. */
/**
 * An instant, not a wall-clock reading.
 *
 * A bare "2026-09-23T21:30" is resolved by the runtime's own timezone, so the
 * same submission meant different instants on a developer's laptop and on
 * Vercel. Requiring an explicit offset makes the ambiguity impossible rather
 * than merely discouraged, and the client sends toISOString().
 */
const absoluteDateTime = z
  .string()
  .refine((value) => /(?:Z|[+-]\d{2}:?\d{2})$/.test(value.trim()), {
    message:
      'Timestamp must carry a UTC offset, for example 2026-09-23T15:30:00.000Z',
  })
  .pipe(z.coerce.date());

export const createCheckinSchema = z.object({
  expectedArrivalTime: absoluteDateTime,
  location: trimmedString(1, 255),
  emergencyContactId: idSchema.optional().nullable(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateCheckinSchema = z.object({
  id: idSchema,
  status: z.enum(CHECKIN_STATUSES),
  sosTriggered: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Lost and found
// ---------------------------------------------------------------------------

export const LOST_FOUND_CATEGORIES = [
  'electronics',
  'clothing',
  'books',
  'accessories',
  'documents',
  'keys',
  'other',
] as const;

/** `userId` is absent by design: the handler takes it from the session. */
export const createLostFoundSchema = z.object({
  type: z.enum(['lost', 'found']),
  title: trimmedString(1, 255),
  description: trimmedString(1, 5000),
  category: z.enum(LOST_FOUND_CATEGORIES),
  location: trimmedString(1, 255).optional(),
  dateLostFound: z.coerce.date().optional().nullable(),
  imageUrl: safeUrlSchema.optional().or(z.literal('')),
  contactInfo: contactInfoSchema.optional(),
  isAnonymous: z.boolean().optional(),
});

export const updateLostFoundSchema = z.object({
  id: idSchema,
  status: z.enum(['active', 'resolved', 'expired']),
});

// ---------------------------------------------------------------------------
// Emergency contacts (admin managed)
// ---------------------------------------------------------------------------

export const createContactSchema = z.object({
  name: trimmedString(1, 255),
  phoneNumber: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  department: trimmedString(1, 255).optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  id: idSchema,
  isActive: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Safety resources and discussion categories (admin managed)
// ---------------------------------------------------------------------------

export const RESOURCE_CATEGORIES = [
  'emergency',
  'mental_health',
  'safety_tips',
  'helplines',
  'campus_resources',
] as const;

export const createResourceSchema = z.object({
  title: trimmedString(1, 255),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(RESOURCE_CATEGORIES),
  content: trimmedString(1, 20000),
  contactInfo: z.record(z.string().max(500)).optional(),
  priority: z.coerce.number().int().min(0).max(100).optional(),
});

export const createCategorySchema = z.object({
  name: trimmedString(1, 100),
  description: z.string().trim().max(1000).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex value such as #3B82F6')
    .optional(),
});

// ---------------------------------------------------------------------------
// Badges (admin awarded)
// ---------------------------------------------------------------------------

export const awardBadgeSchema = z
  .object({
    userId: idSchema,
    badgeId: idSchema.optional(),
    points: z.coerce.number().int().min(-1000).max(1000).optional(),
  })
  .refine((value) => value.badgeId !== undefined || value.points !== undefined, {
    message: 'Provide a badgeId, a points value, or both',
  });

// ---------------------------------------------------------------------------
// Emergency and complaint reports
// ---------------------------------------------------------------------------

// Must stay in step with the category ENUM on emergency_reports and with the
// choices offered in components/emergency/emergency-request.tsx.
export const EMERGENCY_CATEGORIES = [
  'medical',
  'fire',
  'security',
  'accident',
  'violence',
  'other',
] as const;

export const createEmergencyReportSchema = z.object({
  title: trimmedString(1, 255),
  description: trimmedString(1, 5000),
  category: z.enum(EMERGENCY_CATEGORIES),
  location: trimmedString(1, 255),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  isAnonymous: z.boolean().optional(),
  attachments: z.array(safeUrlSchema).max(10).optional(),
});

// Must stay in step with the category ENUM on complaints and with the
// choices offered in components/emergency/complaint-form.tsx.
export const COMPLAINT_CATEGORIES = [
  'facility',
  'service',
  'academic',
  'harassment',
  'bullying',
  'discrimination',
  'misconduct',
  'property',
  'noise',
  'other',
] as const;

export const createComplaintSchema = z.object({
  title: trimmedString(1, 255),
  description: trimmedString(1, 5000),
  category: z.enum(COMPLAINT_CATEGORIES),
  location: trimmedString(1, 255).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  isAnonymous: z.boolean().optional(),
  attachments: z.array(safeUrlSchema).max(10).optional(),
});

// ---------------------------------------------------------------------------
// Parsing helper
// ---------------------------------------------------------------------------

// The `?: never` members keep this usable as a discriminated union even
// though the project compiles with `strict: false`, where narrowing on a
// boolean discriminant alone does not remove the other branch.
export type ParseResult<T> =
  | { ok: true; data: T; response?: never }
  | { ok: false; data?: never; response: NextResponse };

/**
 * Parse and validate a JSON request body.
 *
 * On failure this returns a ready-to-send 400 whose `details` name the
 * offending fields without echoing the submitted values back, so a bad
 * password attempt never appears in a response or a log.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<ParseResult<z.infer<T>>> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Request body must be valid JSON' },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message: issue.message,
    }));

    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Validation failed', details },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

/** Parse and validate URL search params against a schema. */
export function parseQuery<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): ParseResult<z.infer<T>> {
  const parsed = schema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(query)',
      message: issue.message,
    }));

    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Invalid query parameters', details },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
