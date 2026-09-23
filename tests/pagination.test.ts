// Pagination comes straight off the query string, so it is attacker-controlled
// on endpoints that need no account. Three listing routes did
// `parseInt(searchParams.get('limit') || '20')` and used the result as-is:
// NaN reached the database and returned a 500, and a huge value was simply
// obeyed.

import { describe, it, expect } from 'vitest';
import { parsePagination } from '../lib/validation';

const q = (search: string) => new URLSearchParams(search);

describe('defaults', () => {
  it('uses page 1 and the given default limit when nothing is supplied', () => {
    expect(parsePagination(q(''), { defaultLimit: 20 })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    });
  });

  it('falls back to 20 when no default is given', () => {
    expect(parsePagination(q('')).limit).toBe(20);
  });
});

describe('valid input', () => {
  it('reads page and limit', () => {
    expect(parsePagination(q('page=3&limit=10'))).toEqual({
      page: 3,
      limit: 10,
      offset: 20,
    });
  });

  it('computes offset from page and limit', () => {
    expect(parsePagination(q('page=5&limit=25')).offset).toBe(100);
  });
});

describe('malformed input falls back rather than failing', () => {
  for (const value of ['abc', '', 'null', 'undefined', 'NaN', '1e999']) {
    it(`limit=${JSON.stringify(value)} uses the default`, () => {
      const { limit } = parsePagination(q(`limit=${encodeURIComponent(value)}`), {
        defaultLimit: 20,
        maxLimit: 100,
      });
      // 1e999 parses as Infinity, which is not finite and must not survive.
      expect(Number.isInteger(limit)).toBe(true);
      expect(limit).toBeGreaterThanOrEqual(1);
      expect(limit).toBeLessThanOrEqual(100);
    });
  }

  it('a non-numeric page does not produce a NaN offset', () => {
    const { page, offset } = parsePagination(q('page=abc'));
    expect(page).toBe(1);
    expect(offset).toBe(0);
  });
});

describe('bounds are enforced', () => {
  it('caps an oversized limit at the maximum', () => {
    expect(parsePagination(q('limit=999999'), { maxLimit: 100 }).limit).toBe(100);
  });

  it('raises a zero or negative limit to 1', () => {
    expect(parsePagination(q('limit=0')).limit).toBe(1);
    expect(parsePagination(q('limit=-50')).limit).toBe(1);
  });

  it('raises a zero or negative page to 1', () => {
    expect(parsePagination(q('page=0')).page).toBe(1);
    expect(parsePagination(q('page=-3')).page).toBe(1);
  });

  it('truncates a fractional limit rather than passing it to SQL', () => {
    expect(parsePagination(q('limit=10.9')).limit).toBe(10);
  });

  it('caps an absurd page so the offset stays a sane integer', () => {
    const { page, offset } = parsePagination(q('page=999999999999'), { maxLimit: 100 });
    expect(page).toBeLessThanOrEqual(1_000_000);
    expect(Number.isSafeInteger(offset)).toBe(true);
  });
});
