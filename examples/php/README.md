# MissionInbox PHP SDK — end-to-end example

Single-file walk-through that exercises every method in [`missioninbox/sdk`](https://packagist.org/packages/missioninbox/sdk) against a live environment.

## Prerequisites

- PHP 8.1+ and Composer
- A MissionInbox API key
- For full mode: a registered sending identifier, a recipient you control, and a domain on your account

## Run

```bash
cd examples/php
cp .env.example .env    # fill in at least MI_API_KEY + MI_API_URL
composer install
php main.php
```

## Modes

- **`safe`** (default) — read-only endpoints only. No state changes, no emails sent.
- **`full`** — additionally exercises creates, updates, deletes, redirect setup, and sends **one real email**. Every resource created is deleted before exit.

## Env vars

Same names as the other language examples. See `.env.example`.

## What it does

Numbered sections, same order as the Node example. See `../README.md` for the shared summary.
