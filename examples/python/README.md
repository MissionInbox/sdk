# MissionInbox Python SDK — end-to-end example

Single-file walk-through that exercises every method in [`missioninbox`](https://pypi.org/project/missioninbox/) against a live environment.

## Prerequisites

- Python 3.9+
- A MissionInbox API key
- For full mode: a registered sending identifier, a recipient you control, and a domain on your account

## Run

```bash
cd examples/python
cp .env.example .env    # fill in at least MI_API_KEY + MI_API_URL
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## Modes

- **`safe`** (default) — read-only endpoints only.
- **`full`** — additionally exercises creates, updates, deletes, and sends **one real email**. Every resource created is deleted before exit.

## Env vars

Same names as the other language examples. See `.env.example`.
