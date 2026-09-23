// Check-in arrival times must be instants, not wall-clock readings.
//
// <input type="datetime-local"> produces "2026-09-23T21:30" with no offset.
// Sent as-is, the server resolved it in its own timezone — Dhaka on a
// developer's laptop, UTC on Vercel — so the same submission meant two
// different instants six hours apart, and escalation ran six hours late in
// production while looking correct in development.

import { describe, it, expect } from 'vitest';
import { createCheckinSchema } from '../lib/validation';

const base = { location: 'Library to Hall 3' };

describe('expectedArrivalTime', () => {
  it('rejects a naive wall-clock string', () => {
    const parsed = createCheckinSchema.safeParse({
      ...base,
      expectedArrivalTime: '2026-09-23T21:30',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a naive string with seconds', () => {
    const parsed = createCheckinSchema.safeParse({
      ...base,
      expectedArrivalTime: '2026-09-23T21:30:00',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts an explicit UTC instant', () => {
    const parsed = createCheckinSchema.safeParse({
      ...base,
      expectedArrivalTime: '2026-09-23T15:30:00.000Z',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts an explicit positive offset', () => {
    const parsed = createCheckinSchema.safeParse({
      ...base,
      expectedArrivalTime: '2026-09-23T21:30:00+06:00',
    });
    expect(parsed.success).toBe(true);
  });

  it('resolves a Dhaka offset to the same instant regardless of server timezone', () => {
    const parsed = createCheckinSchema.safeParse({
      ...base,
      expectedArrivalTime: '2026-09-23T21:30:00+06:00',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // 21:30 in Dhaka is 15:30 UTC, whatever the server thinks local time is.
      expect(parsed.data.expectedArrivalTime.toISOString()).toBe('2026-09-23T15:30:00.000Z');
    }
  });

  it('rejects a value that is not a timestamp at all', () => {
    const parsed = createCheckinSchema.safeParse({ ...base, expectedArrivalTime: 'tomorrow' });
    expect(parsed.success).toBe(false);
  });
});
