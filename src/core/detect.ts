import { EventSource } from '@devvit/web/shared';
import { parseTimestampMs } from './format';

export type DeleteEvaluation =
  | { act: false; reason: string }
  | { act: true; lifetimeMs: number };

/**
 * The trigger payload travels as JSON, so depending on the encoder the enum
 * may arrive as its numeric value or its name string.
 */
export function isUserSelfDelete(source: unknown): boolean {
  return source === EventSource.USER || source === 'USER';
}

/** Pure decision logic for a PostDelete event; side effects live in the route. */
export function evaluateDelete(input: {
  source: unknown;
  eventCreatedAt: string | number | undefined;
  eventDeletedAt: string | number | undefined;
  snapshotCreatedAtMs: number | undefined;
  windowHours: number;
  nowMs: number;
}): DeleteEvaluation {
  if (!isUserSelfDelete(input.source)) {
    return { act: false, reason: `not an author self-delete (source: ${String(input.source)})` };
  }
  const createdAtMs = parseTimestampMs(input.eventCreatedAt) ?? input.snapshotCreatedAtMs;
  if (createdAtMs === undefined) {
    return { act: false, reason: 'creation time unavailable from event and snapshot' };
  }
  const deletedAtMs = parseTimestampMs(input.eventDeletedAt) ?? input.nowMs;
  const lifetimeMs = Math.max(0, deletedAtMs - createdAtMs);
  if (lifetimeMs > input.windowHours * 3_600_000) {
    return { act: false, reason: `outside detection window (${lifetimeMs}ms)` };
  }
  return { act: true, lifetimeMs };
}
