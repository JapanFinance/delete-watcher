export const snapKey = (postId: string) => `snap:${postId}`;
export const dedupeKey = (postId: string) => `dedupe:${postId}`;
export const countKey = (authorId: string) => `qdcount:${authorId}`;

export const DEDUPE_FIELD = 'handled';
export const DEDUPE_TTL_SECONDS = 7 * 24 * 60 * 60;

// Snapshots expire once the detection window has passed, plus a small buffer so a
// delete that lands right at the window boundary is still processed while its snapshot
// exists. The buffer only needs to cover trigger-delivery latency and clock skew — if
// the snapshot expires first, detection still works from the event's own timestamps and
// the notification just omits the content. Keep this small to minimize retention of
// content that was, after all, deleted.
export const SNAPSHOT_TTL_MARGIN_SECONDS = 15 * 60;
export const SNAPSHOT_BODY_MAX_CHARS = 4000;
