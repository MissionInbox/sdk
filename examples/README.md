# Examples

Runnable example projects that exercise the MissionInbox SDKs against a live environment. Each one is a single-file walk-through: numbered sections, one method call per line of output, side-by-side comparable across languages.

| Language | Path | Package used |
|---|---|---|
| Node / TypeScript | [`node/`](./node/) | `@missioninbox/sdk` |
| PHP | [`php/`](./php/) | `missioninbox/sdk` |
| Python | [`python/`](./python/) | `missioninbox` |
| Java | [`java/`](./java/) | `com.missioninbox:sdk` |

All four examples take the same environment variables and produce the same output layout. Bring your own MissionInbox API key — [where to get one](../README.md#get-an-api-key).

## Two modes

- **`safe`** (default) — no writes to your account; read-only endpoints only. Reads still print account state (domain names, identifier addresses, send counts) to stdout, so don't paste unfiltered output into public places.
- **`full`** — additionally exercises creates, updates, deletes, and sends **one real email**. Every resource it creates is deleted before exit. Requires extra env vars (a registered sending identifier + a recipient address + a domain you own on the account). See each example's README.

Pick `full` when you want the end-to-end verification; pick `safe` when you just want to poke around.
