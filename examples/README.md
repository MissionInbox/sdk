# Examples

Runnable example projects that exercise the MissionInbox SDKs against a live environment. Each one is a single-file walk-through: numbered sections, one method call per line of output, side-by-side comparable across languages.

| Language | Path | Package used |
|---|---|---|
| Node / TypeScript | [`node/`](./node/) | `@missioninbox/sdk` |
| PHP | [`php/`](./php/) | `missioninbox/sdk` |
| Python | [`python/`](./python/) | `missioninbox` |
| Java | [`java/`](./java/) | `com.missioninbox:sdk` |

All four examples take the same environment variables and produce the same output layout. Bring your own MissionInbox API key.

## Two modes

- **`safe`** (default) — read-only calls; no state changes on your account. Safe to run in production.
- **`full`** — additionally exercises creates, updates, deletes, and sends **one real email**. Every resource it creates is deleted before exit. Requires extra env vars (a registered sending identifier + a recipient address + a domain you own on the account). See each example's README.

Pick `full` when you want the end-to-end verification; pick `safe` when you just want to poke around.
