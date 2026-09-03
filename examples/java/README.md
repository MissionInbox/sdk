# MissionInbox Java SDK — end-to-end example

Single-file walk-through that exercises every method in [`com.missioninbox:sdk`](https://central.sonatype.com/artifact/com.missioninbox/sdk) against a live environment.

## Prerequisites

- Java 11+ and Maven
- A MissionInbox API key
- For full mode: a registered sending identifier, a recipient you control, and a domain on your account

## Run

```bash
cd examples/java
cp .env.example .env    # fill in at least MI_API_KEY + MI_API_URL
mvn -q compile exec:java
```

## Modes

- **`safe`** (default) — read-only endpoints only.
- **`full`** — additionally exercises creates, updates, deletes, and sends **one real email**. Every resource created is deleted before exit.

## Env vars

Same names as the other language examples. See `.env.example`.
