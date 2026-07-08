export const snapKey = (postId: string) => `snap:${postId}`;
export const dedupeKey = (postId: string) => `dedupe:${postId}`;
export const countKey = (authorId: string) => `qdcount:${authorId}`;

export const DEDUPE_FIELD = 'handled';
export const DEDUPE_TTL_SECONDS = 7 * 24 * 60 * 60;

// Snapshots outlive the detection window by a margin so a boundary-straddling
// delete can still find its content.
export const SNAPSHOT_TTL_MARGIN_SECONDS = 24 * 60 * 60;
export const SNAPSHOT_BODY_MAX_CHARS = 4000;
