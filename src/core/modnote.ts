import { reddit } from '@devvit/web/server';
import type { T3 } from '@devvit/shared-types/tid.js';
import { humanizeDuration, truncate } from './format';

// Reddit caps mod notes at 250 characters.
const NOTE_MAX_CHARS = 250;
const TITLE_MAX_CHARS = 120;

export async function addQuickDeleteModNote(options: {
  subredditName: string;
  username: string;
  postId: string;
  lifetimeMs: number;
  offenseCount: number;
  title?: string | undefined;
}): Promise<void> {
  const titlePart = options.title
    ? `: "${truncate(options.title, TITLE_MAX_CHARS)}"`
    : '';
  const note = truncate(
    `Self-deleted post after ${humanizeDuration(options.lifetimeMs)} (self-delete #${options.offenseCount})${titlePart}`,
    NOTE_MAX_CHARS
  );
  await reddit.addModNote({
    subreddit: options.subredditName,
    user: options.username,
    redditId: options.postId as T3,
    label: 'SPAM_WATCH',
    note,
  });
}
