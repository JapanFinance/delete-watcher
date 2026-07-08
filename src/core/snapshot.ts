import { redis } from '@devvit/web/server';
import { SNAPSHOT_BODY_MAX_CHARS, SNAPSHOT_TTL_MARGIN_SECONDS, snapKey } from './keys';
import { truncate } from './format';

export type PostSnapshot = {
  title?: string | undefined;
  body?: string | undefined;
  createdAtMs?: number | undefined;
  authorId?: string | undefined;
  authorName?: string | undefined;
};

export async function saveSnapshot(
  postId: string,
  snapshot: {
    title: string;
    body: string;
    createdAtMs?: number | undefined;
    authorId?: string | undefined;
    authorName?: string | undefined;
  },
  windowHours: number
): Promise<void> {
  const fields: Record<string, string> = {
    title: snapshot.title,
    body: truncate(snapshot.body, SNAPSHOT_BODY_MAX_CHARS),
  };
  if (snapshot.createdAtMs !== undefined) fields.createdAtMs = String(snapshot.createdAtMs);
  if (snapshot.authorId) fields.authorId = snapshot.authorId;
  if (snapshot.authorName) fields.authorName = snapshot.authorName;

  const key = snapKey(postId);
  await redis.hSet(key, fields);
  await redis.expire(key, Math.ceil(windowHours * 3600) + SNAPSHOT_TTL_MARGIN_SECONDS);
}

export async function loadSnapshot(postId: string): Promise<PostSnapshot> {
  const fields = await redis.hGetAll(snapKey(postId));
  if (!fields || Object.keys(fields).length === 0) {
    return {};
  }
  const createdAtMs = Number(fields.createdAtMs);
  return {
    title: fields.title,
    body: fields.body,
    createdAtMs: Number.isFinite(createdAtMs) && createdAtMs > 0 ? createdAtMs : undefined,
    authorId: fields.authorId,
    authorName: fields.authorName,
  };
}
