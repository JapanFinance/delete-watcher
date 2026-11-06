import { describe, expect, it } from 'vitest';
import { buildDiscordAlertPayload, type QuickDeleteAlert } from './discord';

const BASE_ALERT: QuickDeleteAlert = {
  postId: 't3_123456',
  authorName: 'test_user',
  title: 'Test Post Title',
  body: 'This is the post content body.',
  lifetimeMs: 3_600_000, // 1 hour
  offenseCount: 2,
  subredditName: 'JapanFinance',
};

describe('buildDiscordAlertPayload', () => {
  it('builds a full payload with author, post link, and modern mod ban link', () => {
    const payload = buildDiscordAlertPayload(BASE_ALERT);

    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.embeds).toHaveLength(1);

    const embed = payload.embeds[0]!;
    expect(embed.title).toBe('Self-delete #2 by u/`test_user`');
    expect('url' in embed).toBe(false);
    expect(embed.description).toContain(
      '**[Test Post Title](https://redd.it/123456)**'
    );
    expect(embed.description).toContain('>>> This is the post content body.');
    expect(embed.color).toBe(0xe67e22);
    expect(embed.footer).toEqual({ text: 'r/JapanFinance' });

    expect(embed.fields).toEqual([
      {
        name: 'Author',
        value: 'test_user',
        inline: true,
      },
      {
        name: 'Time alive',
        value: '1h',
        inline: true,
      },
      {
        name: 'Mod tools',
        value:
          '[Ban user](https://www.reddit.com/mod/JapanFinance/banned/) • [Profile](https://www.reddit.com/user/test_user)',
        inline: true,
      },
    ]);
  });

  it('omits offense count from title when undefined', () => {
    const payload = buildDiscordAlertPayload({
      ...BASE_ALERT,
      offenseCount: undefined,
    });
    expect(payload.embeds[0]!.title).toBe('Self-delete by u/`test_user`');
  });

  it('falls back when authorName is undefined', () => {
    const payload = buildDiscordAlertPayload({
      ...BASE_ALERT,
      authorName: undefined,
    });
    const embed = payload.embeds[0]!;
    expect(embed.title).toBe('Self-delete #2 by unknown author');
    expect(embed.fields.find((f) => f.name === 'Author')).toBeUndefined();
    expect(embed.fields.find((f) => f.name === 'Mod tools')?.value).toBe(
      '[Ban user](https://www.reddit.com/mod/JapanFinance/banned/)'
    );
  });

  it('omits mod tools and footer when subredditName is undefined', () => {
    const payload = buildDiscordAlertPayload({
      ...BASE_ALERT,
      subredditName: undefined,
    });
    const embed = payload.embeds[0]!;
    expect(embed.footer).toBeUndefined();
    expect(embed.fields.find((f) => f.name === 'Mod tools')).toBeUndefined();
  });

  it('handles missing body by noting content was not captured', () => {
    const payload = buildDiscordAlertPayload({
      ...BASE_ALERT,
      body: undefined,
    });
    expect(payload.embeds[0]!.description).toContain(
      '_(content not captured)_'
    );
  });

  it('handles missing title by linking the raw post url', () => {
    const payload = buildDiscordAlertPayload({
      ...BASE_ALERT,
      title: undefined,
    });
    expect(payload.embeds[0]!.description).toBe(
      '**[https://redd.it/123456](https://redd.it/123456)**\n>>> This is the post content body.'
    );
  });

  it('preserves square brackets in post title without raw escaping artifacts', () => {
    const payload = buildDiscordAlertPayload({
      ...BASE_ALERT,
      title: '[Tax] Selling US [stocks] in Japan',
    });
    expect(payload.embeds[0]!.description).toContain(
      '**[[Tax] Selling US [stocks] in Japan](https://redd.it/123456)**'
    );
  });

  it('truncates long bodies to excerpt limit', () => {
    const longBody = 'x'.repeat(600);
    const payload = buildDiscordAlertPayload({
      ...BASE_ALERT,
      body: longBody,
    });
    // 500 max chars: 499 chars + '…'
    expect(payload.embeds[0]!.description).toContain(`>>> ${'x'.repeat(499)}…`);
  });
});
