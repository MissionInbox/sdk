"""MissionInbox Python SDK — error catalog.

Deliberately triggers each error the SDK maps, prints the raw HTTP response
body observed, and verifies the SDK's exception classification. Companion to
``main.py``; run separately via ``python error-catalog.py``.
"""

from __future__ import annotations

import os
import sys
import time
from typing import Any, Callable

from dotenv import load_dotenv

from missioninbox import (
    AuthenticationError,
    ConflictError,
    MissionInbox,
    MissionInboxError,
    NetworkError,
    NotFoundError,
    UnregisteredSenderError,
    UnverifiedDomainError,
    ValidationError,
)

load_dotenv()

api_key = os.environ.get("MI_API_KEY", "")
base_url = os.environ.get("MI_API_URL", "")
test_sender = os.environ.get("MI_TEST_SENDER", "")
test_to = os.environ.get("MI_TEST_TO", "")
test_domain = os.environ.get("MI_TEST_DOMAIN", "")

if not api_key or not base_url:
    print("MI_API_KEY and MI_API_URL are required.", file=sys.stderr)
    sys.exit(2)

mi = MissionInbox(api_key=api_key, base_url=base_url, max_retries=0)
ts = int(time.time() * 1000)
can_trigger = bool(test_sender and test_to and test_domain)

results: list[dict[str, Any]] = []


def trigger(id_: int, name: str, expected_cls: type[BaseException], fn: Callable[[], Any]) -> None:
    expected = expected_cls.__name__
    print(f"\n━━━ {id_}. {expected}: {name} ━━━")
    try:
        r = fn()
        print(f"  ✗ Expected {expected}, got success: {str(r)[:120]}")
        results.append({"id": id_, "name": name, "expected": expected, "actual": "no-throw", "status": 0, "pass": False})
    except Exception as err:
        actual = type(err).__name__
        status = err.status if isinstance(err, MissionInboxError) else 0
        body = err.body if isinstance(err, MissionInboxError) else None
        passed = isinstance(err, expected_cls)
        mark = "✓" if passed else "✗"
        print(f"  {mark} Actual class:  {actual}" + ("" if passed else f"  (expected {expected})"))
        print(f"     HTTP status:  {status}")
        print(f"     Response body: {body!r}")
        print(f"     Message:       {str(err)[:160]}")
        results.append({"id": id_, "name": name, "expected": expected, "actual": actual, "status": status, "pass": passed})


print(f"MissionInbox error-catalog run — base={base_url}")
if not can_trigger:
    print("  (MI_TEST_SENDER / TO / DOMAIN not set — will skip triggers that need them)")

# 1. AuthenticationError
bad_key = MissionInbox(api_key="obviously-wrong-key", base_url=base_url, max_retries=0)
trigger(1, "wrong API key", AuthenticationError, lambda: bad_key.emails.get_send_limit())

# 2. ValidationError — no recipient
if can_trigger:
    trigger(2, "send with no recipient", ValidationError, lambda: mi.emails.send(
        from_=test_sender,
        subject="no recipient",
        text="should fail validation",
    ))
else:
    print("\n━━━ 2. ValidationError: send with no recipient ━━━\n  (skipped)")

# 3. ValidationError — no body
if can_trigger:
    trigger(3, "send with no body", ValidationError, lambda: mi.emails.send(
        from_=test_sender,
        to=test_to,
        subject="no body",
    ))
else:
    print("\n━━━ 3. ValidationError: send with no body ━━━\n  (skipped)")

# 4. UnregisteredSenderError
if can_trigger:
    trigger(4, "send from unregistered address", UnregisteredSenderError, lambda: mi.emails.send(
        from_=f"never-registered-{ts}@example.invalid",
        to=test_to,
        subject="unregistered",
        text="should fail",
    ))
else:
    print("\n━━━ 4. UnregisteredSenderError ━━━\n  (skipped)")

# 5. NotFoundError
trigger(5, "fetch non-existent sending identifier", NotFoundError,
        lambda: mi.sending_identifiers.get("00000000-0000-0000-0000-000000000000"))

# 6. ConflictError — register identifier twice
if can_trigger:
    test_addr = f"sdk-error-catalog-{ts}@{test_sender.split('@', 1)[1]}"
    first_id = None
    try:
        created = mi.sending_identifiers.create(
            email_address=test_addr,
            display_name="SDK error catalog — safe to delete",
        )
        first_id = created["id"]
        trigger(6, "register identifier that already exists", ConflictError,
                lambda: mi.sending_identifiers.create(email_address=test_addr, display_name="duplicate"))
    except Exception as err:
        print("\n━━━ 6. ConflictError: register identifier twice ━━━")
        print(f"  ✗ Setup failed: {err}")
    finally:
        if first_id:
            try:
                mi.sending_identifiers.delete(first_id)
            except Exception:
                pass
else:
    print("\n━━━ 6. ConflictError ━━━\n  (skipped)")

# 7. UnverifiedDomainError
if can_trigger:
    sub_domain = f"sdk-error-{ts}.{test_domain}"
    test_from = f"sender@{sub_domain}"
    identifier_id = None
    try:
        created = mi.domains.bulk_create(domains=[{"domainName": sub_domain}])
        mi.tasks.wait_for(created["taskId"], poll_interval=3.0, timeout=30.0)
        identifier = mi.sending_identifiers.create(email_address=test_from)
        identifier_id = identifier["id"]
        trigger(7, "send from unverified-domain identifier", UnverifiedDomainError,
                lambda: mi.emails.send(from_=test_from, to=test_to, subject="unverified", text="should fail"))
    except Exception as err:
        print("\n━━━ 7. UnverifiedDomainError ━━━")
        print(f"  ✗ Setup failed: {err}")
    finally:
        if identifier_id:
            try:
                mi.sending_identifiers.delete(identifier_id)
            except Exception:
                pass
        try:
            mi.domains.bulk_delete(domain_names=[sub_domain])
        except Exception:
            pass
else:
    print("\n━━━ 7. UnverifiedDomainError ━━━\n  (skipped)")

# 8. NetworkError
unreachable = MissionInbox(api_key=api_key, base_url="https://127.0.0.1:1", max_retries=0, timeout=2.0)
trigger(8, "unreachable host", NetworkError, lambda: unreachable.health.check())

# Summary
print("\n━━━ Summary ━━━")
passes = sum(1 for r in results if r["pass"])
print(f"  {passes}/{len(results)} exception mappings correct")
for r in results:
    mark = "✓" if r["pass"] else "✗"
    print(f"  {mark} #{r['id']} [{r['status']}] {r['expected']}: {r['name']}")
print()
print("Not tested here (need special account state or would burden staging):")
print("  SubscriptionInactiveError — inactive account")
print("  SendLimitExceededError    — Free plan hitting 20/day cap")
print("  DomainBlacklistedError    — blacklisted domain")
print("  RateLimitError            — sustained request volume")
print("  ServerError               — API 5xx")
print("  SendError                 — SES rejection")
print("  PermissionError (base)    — non-specific 403")
