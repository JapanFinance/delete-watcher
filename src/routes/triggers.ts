import { Hono } from 'hono';
import type {
  OnPostDeleteRequest,
  OnPostSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { redis } from '@devvit/web/server';
import {
  countKey,
  DEDUPE_FIELD,
  DEDUPE_TTL_SECONDS,
  dedupeKey,
} from '../core/keys';
import { getAppSettings } from '../core/settings';
import { loadSnapshot, saveSnapshot } from '../core/snapshot';
import { evaluateDelete } from '../core/detect';
import { sendDiscordAlert } from '../core/discord';
import { addQuickDeleteModNote } from '../core/modnote';

export const triggers = new Hono();

triggers.post('/on-post-submit', async (c) => {
  try {
    const event = await c.req.json<OnPostSubmitRequest>();
    const post = event.post;
    if (post?.id) {
      const { detectionWindowHours } = await getAppSettings();
      await saveSnapshot(
        post.id,
        {
          title: post.title ?? '',
          body: post.selftext ?? '',
          createdAtMs: post.createdAt || undefined,
          authorId: event.author?.id,
          authorName: event.author?.name,
        },
        detectionWindowHours
      );
    }
  } catch (error) {
    // Never signal failure here: redelivering a submit event buys nothing,
    // and a missing snapshot only degrades the eventual notification.
    console.error('on-post-submit: failed to snapshot post', error);
  }
  return c.json<TriggerResponse>({ status: 'ok' }, 200);
});

triggers.post('/on-post-delete', async (c) => {
  const event = await c.req.json<OnPostDeleteRequest>();
  const postId = event.postId;
  if (!postId) {
    return c.json<TriggerResponse>({ status: 'ok' }, 200);
  }

  const appSettings = await getAppSettings();
  if (!appSettings.enableDiscord && !appSettings.enableModNote) {
    return c.json<TriggerResponse>({ status: 'ok' }, 200);
  }

  const snapshot = await loadSnapshot(postId);
  const evaluation = evaluateDelete({
    source: event.source,
    eventCreatedAt: event.createdAt,
    eventDeletedAt: event.deletedAt,
    snapshotCreatedAtMs: snapshot.createdAtMs,
    windowHours: appSettings.detectionWindowHours,
    nowMs: Date.now(),
  });
  if (!evaluation.act) {
    console.log(`on-post-delete: skipping ${postId}: ${evaluation.reason}`);
    return c.json<TriggerResponse>({ status: 'ok' }, 200);
  }

  // Atomically claim this event before any side effect. Trigger delivery is
  // at-least-once; without the claim, concurrent redeliveries race past a
  // check-then-act gate and duplicate every action.
  const claimed = await redis.hSetNX(dedupeKey(postId), DEDUPE_FIELD, '1');
  if (claimed === 0) {
    console.log(`on-post-delete: skipping duplicate delivery for ${postId}`);
    return c.json<TriggerResponse>({ status: 'ok' }, 200);
  }
  await redis.expire(dedupeKey(postId), DEDUPE_TTL_SECONDS);

  const authorId = event.author?.id ?? snapshot.authorId;
  const authorName = event.author?.name ?? snapshot.authorName;
  const offenseCount = authorId
    ? await redis.incrBy(countKey(authorId), 1)
    : undefined;
  const subredditName = event.subreddit?.name;

  let attempted = 0;
  let succeeded = 0;

  if (appSettings.enableDiscord && appSettings.discordWebhookUrl) {
    attempted++;
    try {
      await sendDiscordAlert(appSettings.discordWebhookUrl, {
        postId,
        authorName,
        title: snapshot.title,
        body: snapshot.body,
        lifetimeMs: evaluation.lifetimeMs,
        offenseCount,
        subredditName,
      });
      succeeded++;
    } catch (error) {
      console.error(
        `on-post-delete: Discord alert failed for ${postId}`,
        error
      );
    }
  }

  if (appSettings.enableModNote && authorName && subredditName) {
    attempted++;
    try {
      await addQuickDeleteModNote({
        subredditName,
        username: authorName,
        postId,
        lifetimeMs: evaluation.lifetimeMs,
        offenseCount: offenseCount ?? 1,
        title: snapshot.title,
      });
      succeeded++;
    } catch (error) {
      console.error(`on-post-delete: mod note failed for ${postId}`, error);
    }
  }

  if (attempted > 0 && succeeded === 0) {
    // Nothing observable happened: release the claim and undo the counter so
    // a redelivery can retry from scratch.
    await redis.hDel(dedupeKey(postId), [DEDUPE_FIELD]);
    if (authorId && offenseCount !== undefined) {
      await redis.incrBy(countKey(authorId), -1);
    }
    return c.json(
      { status: 'error', message: `all actions failed for ${postId}` },
      500
    );
  }

  console.log(
    `on-post-delete: flagged ${postId} by u/${authorName ?? 'unknown'} ` +
      `(alive ${evaluation.lifetimeMs}ms, offense #${offenseCount ?? '?'}, ` +
      `${succeeded}/${attempted} actions succeeded)`
  );
  return c.json<TriggerResponse>({ status: 'ok' }, 200);
});
