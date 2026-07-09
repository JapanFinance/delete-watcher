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
- `npm test` — run the Vitest unit tests (`npm run test:watch` for watch mode)
- `npm run type-check` / `npm run lint` — TypeScript and ESLint checks
- `npm run format` — check Prettier formatting (CI runs this); `npm run prettier` to auto-fix
- `npm run build` — build the server bundle
- `npm run deploy` — upload a new version (type-check + lint + `devvit upload`)
- `npm run launch` — submit for review and publish (`deploy` + `devvit publish`)

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm ci`, `type-check`, `lint`,
`format` (Prettier `--check`), and `build` on every push to `main` and on every pull
request. This is what validates Dependabot's dependency-bump PRs before merge.

Line endings are pinned to LF via [`.gitattributes`](.gitattributes) so the Prettier
check behaves identically locally (including on Windows) and in CI on Linux.

**CI never uploads or publishes.** Deploying a new version to Reddit is a deliberate
manual step (`npm run deploy` / `npm run launch`) so that a merged dependency bump
can't push a build to the live app on its own.

### Dependabot note

Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml)) opens grouped weekly PRs.
It ignores `devvit@1.0.0` / `@devvit/*@1.0.0` — a stray/mistaken publish that outranks
the real `0.13.x` line by semver. Do not merge a PR that bumps devvit to `1.0.0`; the
current line is `0.13.x`.

## Releasing a new version

Releasing is a deliberate manual step. The **Devvit app version is owned by the Devvit
CLI, not by `package.json`** — `package.json` is never published to npm and its `version`
field is ignored, so leave it as-is. Each `devvit publish` triggers a Reddit review
(~1–2 business days), so batch changes into infrequent releases rather than publishing
per commit.

Release from a commit that is already green on CI. `npm run deploy` / `launch` only run
type-check + lint before uploading — they do **not** run `format` or `build` the way CI
does — so relying on a green `main` is what guarantees the released build is clean.

1. Make sure `main` is green in CI and checked out at the commit you want to ship.
2. Pick the new version (semver `MAJOR.MINOR.PATCH`) and publish it explicitly so the
   number is deterministic:
   ```
   npx devvit publish --version X.Y.Z
   ```
   (`--bump patch|minor|major` also works and defaults to `patch`, but an explicit
   `--version` is easier to tag. Prerelease versions cannot be published.)
3. Tag that exact commit and push the tag:
   ```
   git tag -a vX.Y.Z -m "Release X.Y.Z"
   git push origin vX.Y.Z
   ```
4. Create a [GitHub Release](https://github.com/JapanFinance/delete-watcher/releases/new)
   from the tag and use "Generate release notes" for the changelog. (GitHub Releases are
   the changelog — there is no `CHANGELOG.md`.)

Reddit review status is on the [app page](https://developers.reddit.com/apps/delete-watcher).

### First install on a new subreddit

Once a published version is approved, install it on the target subreddit from the
[app page](https://developers.reddit.com/apps/delete-watcher), then set the detection
window and mod-team Discord webhook in the app's settings.
