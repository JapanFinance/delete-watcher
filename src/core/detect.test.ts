import { describe, expect, it } from 'vitest';
import { EventSource } from '@devvit/web/shared';
import { evaluateDelete, isUserSelfDelete } from './detect';

const HOUR_MS = 3_600_000;
// Epoch milliseconds (> 1e12 so parseTimestampMs treats it as ms, not seconds).
const CREATED_MS = 1_700_000_000_000;

/** evaluateDelete with sensible defaults (a USER self-delete 1h into a 24h window). */
function evalWith(
  overrides: Partial<Parameters<typeof evaluateDelete>[0]> = {}
): ReturnType<typeof evaluateDelete> {
  return evaluateDelete({
    source: EventSource.USER,
    eventCreatedAt: CREATED_MS,
    eventDeletedAt: CREATED_MS + HOUR_MS,
    snapshotCreatedAtMs: undefined,
    windowHours: 24,
    nowMs: CREATED_MS + HOUR_MS,
    ...overrides,
  });
}

describe('isUserSelfDelete', () => {
  it('accepts the numeric USER enum value (how the payload arrives on the wire)', () => {
    expect(isUserSelfDelete(EventSource.USER)).toBe(true);
  });

  it('accepts the "USER" name string (in case an encoder sends names)', () => {
    expect(isUserSelfDelete('USER')).toBe(true);
  });

  it('rejects moderator and admin removals', () => {
    expect(isUserSelfDelete(EventSource.MODERATOR)).toBe(false);
    expect(isUserSelfDelete(EventSource.ADMIN)).toBe(false);
    expect(isUserSelfDelete('MODERATOR')).toBe(false);
  });

  it('rejects unknown/absent sources', () => {
    expect(isUserSelfDelete(0)).toBe(false);
    expect(isUserSelfDelete(undefined)).toBe(false);
  });
});

describe('evaluateDelete', () => {
  it('flags a self-delete within the window', () => {
    expect(evalWith()).toEqual({ act: true, lifetimeMs: HOUR_MS });
  });

  it('flags when the source arrives as the "USER" name string', () => {
    expect(evalWith({ source: 'USER' })).toEqual({
      act: true,
      lifetimeMs: HOUR_MS,
    });
  });

  it('flags a delete exactly at the window boundary (inclusive)', () => {
    expect(evalWith({ eventDeletedAt: CREATED_MS + 24 * HOUR_MS })).toEqual({
      act: true,
      lifetimeMs: 24 * HOUR_MS,
    });
  });

  it('skips a delete one millisecond past the window', () => {
    const result = evalWith({ eventDeletedAt: CREATED_MS + 24 * HOUR_MS + 1 });
    expect(result.act).toBe(false);
    if (!result.act)
      expect(result.reason).toContain('outside detection window');
  });

  it('skips moderator removals', () => {
    const result = evalWith({ source: EventSource.MODERATOR });
    expect(result.act).toBe(false);
    if (!result.act) {
      expect(result.reason).toContain('not an author self-delete');
    }
  });

  it('skips admin removals', () => {
    expect(evalWith({ source: EventSource.ADMIN }).act).toBe(false);
  });

  it('skips unknown sources defensively', () => {
    expect(evalWith({ source: 0 }).act).toBe(false);
  });

  it('falls back to the snapshot creation time when the event lacks one', () => {
    expect(
      evalWith({ eventCreatedAt: undefined, snapshotCreatedAtMs: CREATED_MS })
    ).toEqual({ act: true, lifetimeMs: HOUR_MS });
  });

  it('skips when no creation time is available from event or snapshot', () => {
    const result = evalWith({
      eventCreatedAt: undefined,
      snapshotCreatedAtMs: undefined,
    });
    expect(result.act).toBe(false);
    if (!result.act)
      expect(result.reason).toContain('creation time unavailable');
  });

  it('falls back to nowMs when the event lacks a deletion time', () => {
    expect(
      evalWith({
        eventDeletedAt: undefined,
        nowMs: CREATED_MS + 2 * HOUR_MS,
      })
    ).toEqual({ act: true, lifetimeMs: 2 * HOUR_MS });
  });

  it('clamps a negative lifetime (deleted-before-created clock skew) to zero', () => {
    expect(evalWith({ eventDeletedAt: CREATED_MS - HOUR_MS })).toEqual({
      act: true,
      lifetimeMs: 0,
    });
  });

  it('normalizes epoch-seconds timestamps to milliseconds', () => {
    const createdSec = 1_700_000_000; // < 1e12 → treated as seconds
    expect(
      evalWith({
        eventCreatedAt: createdSec,
        eventDeletedAt: createdSec + 3600,
      })
    ).toEqual({ act: true, lifetimeMs: HOUR_MS });
  });

  it('parses ISO-8601 timestamps', () => {
    expect(
      evalWith({
        eventCreatedAt: '2026-01-01T00:00:00.000Z',
        eventDeletedAt: '2026-01-01T01:00:00.000Z',
      })
    ).toEqual({ act: true, lifetimeMs: HOUR_MS });
  });

  it('honors a fractional window (0.05h ≈ 3 minutes), matching the playtest boundary', () => {
    expect(
      evalWith({ windowHours: 0.05, eventDeletedAt: CREATED_MS + 120_000 })
    ).toEqual({ act: true, lifetimeMs: 120_000 });

    expect(
      evalWith({ windowHours: 0.05, eventDeletedAt: CREATED_MS + 240_000 }).act
    ).toBe(false);
  });
});
