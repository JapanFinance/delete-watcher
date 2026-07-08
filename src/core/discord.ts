import { humanizeDuration, postShortlink, truncate } from './format';

const EXCERPT_MAX_CHARS = 500;
const FETCH_TIMEOUT_MS = 5000;
const EMBED_COLOR_WARNING_ORANGE = 0xe67e22;

export type QuickDeleteAlert = {
  postId: string;
  authorName?: string | undefined;
  title?: string | undefined;
  body?: string | undefined;
  lifetimeMs: number;
  offenseCount?: number | undefined;
  subredditName?: string | undefined;
};

/** Throws on network failure or non-2xx so the caller can count the action as failed. */
export async function sendDiscordAlert(webhookUrl: string, alert: QuickDeleteAlert): Promise<void> {
  const author = alert.authorName ?? 'unknown author';
  const descriptionParts: string[] = [];
  if (alert.title) {
    descriptionParts.push(`**${truncate(alert.title, 250)}**`);
  }
  descriptionParts.push(
    alert.body ? `>>> ${truncate(alert.body, EXCERPT_MAX_CHARS)}` : '_(content not captured)_'
  );

  const payload = {
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: truncate(
          alert.offenseCount !== undefined
            ? `Quick self-delete #${alert.offenseCount} by u/${author}`
            : `Quick self-delete by u/${author}`,
          256
        ),
        description: descriptionParts.join('\n'),
        color: EMBED_COLOR_WARNING_ORANGE,
        fields: [
          ...(alert.authorName
            ? [
                {
                  name: 'Author',
                  value: `[u/${alert.authorName}](https://www.reddit.com/user/${alert.authorName})`,
                  inline: true,
                },
              ]
            : []),
          { name: 'Time alive', value: humanizeDuration(alert.lifetimeMs), inline: true },
          { name: 'Post', value: postShortlink(alert.postId), inline: true },
        ],
        ...(alert.subredditName ? { footer: { text: `r/${alert.subredditName}` } } : {}),
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Discord webhook responded ${response.status}: ${await response.text()}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
