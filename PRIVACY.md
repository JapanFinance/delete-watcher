# Privacy Policy — Delete Watcher

_Last updated: 2026-07-08_

Delete Watcher ("the app") is a moderation tool built by the moderators of
[r/JapanFinance](https://www.reddit.com/r/JapanFinance) on Reddit's Developer Platform
(Devvit). It runs only in subreddits where a moderator has installed it. This policy
explains what data the app processes and why.

## What the app processes

When installed in a subreddit, the app processes the following, only for posts made in
that subreddit:

- **Post content** — the title and body text of new posts, captured when the post is
  submitted.
- **Author identifiers** — the username and Reddit user ID of the person who made the
  post.
- **Post metadata** — the post ID, subreddit name, and creation/deletion timestamps.

The app does not process private messages, does not read comments, and does not collect
email addresses, IP addresses, passwords, or any information outside the subreddit where
it is installed.

## How the app uses this data

The app's sole purpose is to detect when a post's author deletes their own post within a
configurable time window (default 24 hours) and to alert the subreddit's moderators. To
do this it:

- Temporarily stores a snapshot of each new post's title and body so that, if the post is
  self-deleted, moderators can still see what it contained.
- Maintains a per-author count of how many self-deletes that user has made in the
  subreddit, which is included in alerts.
- When a qualifying self-delete is detected, notifies the moderators (see _Sharing_
  below).

Moderator removals and Reddit admin removals do **not** trigger alerts; only deletions by
the post's own author do.

## Where data is stored and for how long

Data is stored in the Redis datastore provided and hosted by Reddit's Developer Platform.
The app does not operate any separate database or send data to any server run by the
developer.

- **Post snapshots** are automatically deleted once the detection window has elapsed, plus
  a short buffer of about 15 minutes to allow for event-delivery timing. For example, with
  the default 24-hour window, a snapshot is removed roughly 24 hours after the post is
  made; with a 30-minute window, roughly 45 minutes after.
- **Duplicate-event markers** are automatically deleted after about 7 days.
- **Per-author self-delete counts** are retained until the app is uninstalled or the
  moderators clear them. These are counts and identifiers, not post content.

Uninstalling the app from a subreddit ends all further processing for that subreddit.

## Operational logs

As it runs, the app writes brief operational log lines — for example, that a post was
flagged, or the reason a deletion was skipped. These log lines can include post IDs, the
author's username, timing, the self-delete count, and technical error details when an
action fails. They do **not** include the post's title or body.

These logs are part of Reddit's Developer Platform. They are visible to the moderators of
the subreddit where the app is installed (through the platform's app-logs tooling), and to
the app's developer if they stream the app's logs for debugging or troubleshooting. They
are retained by Reddit's Developer Platform under its own log handling, not stored in the
app's own datastore.

## Sharing with third parties

If — and only if — a subreddit's moderators configure a Discord webhook URL in the app's
settings, then when a qualifying self-delete is detected the app sends a message to that
Discord webhook containing the author's username, the post title, an excerpt of the post
body, timing information, and the author's self-delete count. That information is then
handled by Discord under [Discord's Privacy Policy](https://discord.com/privacy) and by
whoever controls the receiving Discord server.

If no Discord webhook is configured, the app does not transmit any data outside Reddit; it
only records a moderator note on the author's account within Reddit's own moderation
tools.

The app does not sell data, does not use it for advertising, and does not use it for any
purpose other than the moderation function described above.

## Responsibility

The moderators who install and configure the app in a given subreddit decide whether to
enable Discord notifications and where those notifications are sent, and are responsible
for handling the resulting data appropriately within their moderation team.

## Changes to this policy

This policy may be updated as the app changes. Material changes will be reflected by
updating the "Last updated" date above.

## Contact

Questions about this policy can be sent to the moderators of r/JapanFinance via
[modmail](https://www.reddit.com/message/compose?to=%2Fr%2FJapanFinance).
