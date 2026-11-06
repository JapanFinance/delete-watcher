export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function humanizeDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 1) {
    return 'less than a minute';
  }
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

/** Short reddit.com link that identifies the post even after deletion. */
export function postShortlink(postId: string): string {
  return `https://redd.it/${postId.replace(/^t3_/, '')}`;
}

/** Link to the subreddit's banned users moderation tool in modern Reddit. */
export function subredditBannedUrl(subredditName: string): string {
  return `https://www.reddit.com/mod/${subredditName}/banned/`;
}

/**
 * Normalizes a timestamp that may arrive as an ISO-8601 string or as an epoch
 * number (seconds or milliseconds) into epoch milliseconds.
 */
export function parseTimestampMs(
  value: string | number | undefined
): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(num) && num > 0) {
    // Epoch seconds are ~1e9; epoch milliseconds are ~1e12.
    return num < 1e12 ? num * 1000 : num;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}
