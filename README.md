# Delete Watcher

A Devvit mod tool that detects when a user creates a post and then **self-deletes it within a configurable window** (default: 24 hours). Built for r/JapanFinance.

Users sometimes post a question, collect answers, and delete the post — removing context that would have helped future readers — or probe the community and delete before mods can review. This app surfaces that pattern to the mod team.

## What it does

On every new post, the app snapshots the title and body. When a post is deleted, it checks _who_ deleted it — only **author self-deletes** are considered; moderator and admin removals are ignored. If the post lived less than the detection window, the app:

- **Sends a Discord webhook notification** with the author, what the post said, how long it was up, and the author's running self-delete count
- **Adds a mod note** (`SPAM_WATCH`) to the author so the pattern is visible in their mod-tools history

Each author's self-delete count is tracked persistently, so notifications read "Self-delete #3 by u/example".

## Settings (per subreddit)

| Setting                      | Default   | Description                                                                                              |
| ---------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| Detection window (hours)     | 24        | Flag posts self-deleted within this many hours of posting. Fractional values allowed (0.5 = 30 minutes). |
| Discord webhook URL          | _(empty)_ | Webhook to notify. Empty disables Discord notifications.                                                 |
| Send Discord notifications   | on        | Toggle the Discord action.                                                                               |
| Add a mod note to the author | on        | Toggle the mod note action.                                                                              |
