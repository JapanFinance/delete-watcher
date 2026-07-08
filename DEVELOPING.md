# Developing Delete Watcher

Developer notes for this app. For what the app does and its settings, see the [README](README.md).

## Implementation notes

- Devvit Web app (server only, no UI) based on the official [Mod Tool template](https://github.com/reddit/devvit-template-mod-tool-devvit-web): Hono server + `devvit.json`.
- `onPostDelete`'s `source` field distinguishes author self-deletes (`USER`) from mod/admin removals. It arrives as the numeric enum value on the wire (`1` = USER, `3` = MODERATOR), not the string name, so the handler matches both forms.
- Trigger delivery is at-least-once, so the delete handler atomically claims each post via `redis.hSetNX` **before** any side effect, and rolls the claim (and counter) back if every action fails, letting redelivery retry. See [LilSpazJoekp/discord-relay#7](https://github.com/LilSpazJoekp/discord-relay/pull/7) for the pattern's origin.
- Snapshots live in Redis with a TTL of the detection window plus a 24h margin. If a snapshot is missing (post predates install, or the window was raised), detection still works from the event's own timestamps — the notification just says "(content not captured)".

## Project structure

```
src/
├── index.ts             # Hono server setup
├── core/
│   ├── detect.ts        # Pure detection logic (source + window check)
│   ├── snapshot.ts      # Post content snapshots in Redis
│   ├── discord.ts       # Webhook embed
│   ├── modnote.ts       # SPAM_WATCH mod note
│   ├── settings.ts      # Typed settings access + validation rules
│   ├── keys.ts          # Redis key schema
│   └── format.ts        # Duration/truncation helpers
└── routes/
    ├── triggers.ts      # onPostSubmit / onPostDelete handlers
    ├── settings.ts      # Settings validation endpoints
    └── api.ts           # (unused) public API router
```

## Commands

- `npm run dev` — playtest with live reload on a test subreddit (r/delete_watcher_dev)
- `npm run type-check` / `npm run lint` — TypeScript and ESLint checks
- `npm run deploy` — upload a new version
- `npm run launch` — submit for review and publish

## Publishing

`npm run launch` uploads and submits for Reddit review (unlisted, ~1–2 business days). Once approved, install on the target subreddit from the [app page](https://developers.reddit.com/apps/delete-watcher) and set the detection window and mod-team webhook there.
