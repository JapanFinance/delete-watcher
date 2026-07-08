# Quick-Delete Watch

A Devvit mod tool that detects when a user creates a post and then **self-deletes it within a configurable window** (default: 24 hours). Built for r/JapanFinance.

Users sometimes post a question, collect answers, and delete the post — removing context that would have helped future readers — or probe the community and delete before mods can review. This app surfaces that pattern to the mod team.

## What it does

On every new post, the app snapshots the title and body. When a post is deleted, it checks *who* deleted it — only **author self-deletes** are considered; moderator and admin removals are ignored. If the post lived less than the detection window, the app:

- **Sends a Discord webhook notification** with the author, what the post said, how long it was up, and the author's running quick-delete count
- **Adds a mod note** (`SPAM_WATCH`) to the author so the pattern is visible in their mod-tools history

Each author's quick-delete count is tracked persistently, so notifications read "Quick self-delete #3 by u/example".

## Settings (per subreddit)

| Setting | Default | Description |
|---|---|---|
| Detection window (hours) | 24 | Flag posts self-deleted within this many hours of posting. Fractional values allowed (0.5 = 30 minutes). |
| Discord webhook URL | *(empty)* | Webhook to notify. Empty disables Discord notifications. |
| Send Discord notifications | on | Toggle the Discord action. |
| Add a mod note to the author | on | Toggle the mod note action. |

## Implementation notes

- Devvit Web app (server only, no UI) based on the official [Mod Tool template](https://github.com/reddit/devvit-template-mod-tool-devvit-web): Hono server + `devvit.json`.
- `onPostDelete`'s `source` field distinguishes author self-deletes (`USER`) from mod/admin removals.
- Trigger delivery is at-least-once, so the delete handler atomically claims each post via `redis.hSetNX` **before** any side effect, and rolls the claim (and counter) back if every action fails, letting redelivery retry. See [LilSpazJoekp/discord-relay#7](https://github.com/LilSpazJoekp/discord-relay/pull/7) for the pattern's origin.
- Snapshots live in Redis with a TTL of the detection window plus a 24h margin. If a snapshot is missing (post predates install, or the window was raised), detection still works from the event's own timestamps — the notification just says "(content not captured)".

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

## Development

- `npm run dev` — playtest with live reload on a test subreddit
- `npm run type-check` / `npm run lint` — TypeScript and ESLint checks
- `npm run deploy` — upload a new version
- `npm run launch` — submit for review and publish
