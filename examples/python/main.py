"""MissionInbox Python SDK — end-to-end walk-through.

Ports the Node/PHP examples section-for-section. Set MI_EXAMPLE_MODE=full to
exercise destructive endpoints; every resource created is deleted at exit.
"""

from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from dotenv import load_dotenv

from missioninbox import (
    AuthenticationError,
    MissionInbox,
    MissionInboxError,
    UnregisteredSenderError,
)

# ─────────────────────────────────────────────────────────────────────────────
# Env
# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

api_key = os.environ.get("MI_API_KEY", "")
base_url = os.environ.get("MI_API_URL", "")
mode = os.environ.get("MI_EXAMPLE_MODE", "safe").lower()
test_sender = os.environ.get("MI_TEST_SENDER", "")
test_to = os.environ.get("MI_TEST_TO", "")
test_domain = os.environ.get("MI_TEST_DOMAIN", "")
test_redirect_domain = os.environ.get("MI_TEST_REDIRECT_DOMAIN", "")

if not api_key:
    print("Missing MI_API_KEY. Copy .env.example to .env and fill it in.", file=sys.stderr)
    sys.exit(2)
if not base_url:
    print("Missing MI_API_URL. Copy .env.example to .env and fill it in.", file=sys.stderr)
    sys.exit(2)
if mode not in ("safe", "full"):
    print(f"MI_EXAMPLE_MODE must be 'safe' or 'full' (got '{mode}')", file=sys.stderr)
    sys.exit(2)

is_full = mode == "full"

if is_full:
    missing = [k for k, v in [
        ("MI_TEST_SENDER", test_sender),
        ("MI_TEST_TO", test_to),
        ("MI_TEST_DOMAIN", test_domain),
    ] if not v]
    if missing:
        print(f"Full mode requires: {', '.join(missing)}", file=sys.stderr)
        sys.exit(2)

mi = MissionInbox(api_key=api_key, base_url=base_url)
ts = int(time.time() * 1000)
test_sender_domain = test_sender.split("@", 1)[1] if "@" in test_sender else ""

cleanup: list[tuple[str, Callable[[], Any]]] = []
state: dict[str, Any] = {
    "first_domain_id": None,
    "first_domain_name": None,
    "first_identifier_id": None,
    "first_project_id": None,
    "first_task_id": None,
    "created_domains": [],
}

# ─────────────────────────────────────────────────────────────────────────────
# Output helpers
# ─────────────────────────────────────────────────────────────────────────────

def header(n: int, title: str) -> None:
    print(f"\n━━━ {n}. {title} ━━━")


def line(action: str, result: str) -> None:
    pad = " " * (44 - len(action)) if len(action) < 44 else " "
    print(f"  → {action}{pad}{result}")


def skip(reason: str) -> None:
    print(f"  ~ skipped: {reason}")


def fail(action: str, err: BaseException) -> None:
    name = type(err).__name__
    msg = str(err)[:80]
    pad = " " * (44 - len(action)) if len(action) < 44 else " "
    print(f"  ✗ {action}{pad}{name}: {msg}")


def short(v: Any) -> str:
    s = str(v)
    return f"{s[:8]}…" if len(s) > 12 else s


def try_call(action: str, fn: Callable[[], Any], fmt: Optional[Callable[[Any], str]] = None) -> Any:
    try:
        result = fn()
        line(action, fmt(result) if fmt else "ok")
        return result
    except Exception as err:
        fail(action, err)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Sections
# ─────────────────────────────────────────────────────────────────────────────

def section1_health() -> None:
    header(1, "Health check")
    try_call("health.check()", lambda: mi.health.check(), lambda r: r if isinstance(r, str) else str(r))


def section2_send_limit() -> None:
    header(2, "Send-limit status")
    def fmt(r: dict) -> str:
        if r.get("limited"):
            d, m = r.get("daily") or {}, r.get("monthly") or {}
            return f"limited (daily {d.get('sent')}/{d.get('limit')}, monthly {m.get('sent')}/{m.get('limit')})"
        return "unlimited (paid plan)"
    try_call("emails.getSendLimit()", lambda: mi.emails.get_send_limit(), fmt)


def section3_identifiers() -> None:
    header(3, "Sending identifiers")
    ids = try_call("sending_identifiers.list()", lambda: mi.sending_identifiers.list(), lambda r: f"{len(r)} identifier(s)")

    if ids:
        state["first_identifier_id"] = ids[0]["id"]
        try_call(
            f"sending_identifiers.get('{short(state['first_identifier_id'])}')",
            lambda: mi.sending_identifiers.get(state["first_identifier_id"]),
            lambda r: f"{r['emailAddress']} (canSend: {r['canSend']})",
        )

    if not is_full:
        skip("create/update/delete (safe mode)")
        return
    if not test_sender_domain:
        skip("create/update/delete (MI_TEST_SENDER has no domain part)")
        return

    temp = f"sdk-example-{ts}@{test_sender_domain}"
    created = try_call(
        f"sending_identifiers.create('{temp}')",
        lambda: mi.sending_identifiers.create(email_address=temp, display_name="SDK example — safe to delete"),
        lambda r: f"id: {short(r['id'])}",
    )

    if created:
        cleanup.append((
            f"sending_identifiers.delete('{short(created['id'])}')",
            lambda: mi.sending_identifiers.delete(created["id"]),
        ))
        try_call(
            f"sending_identifiers.update('{short(created['id'])}')",
            lambda: mi.sending_identifiers.update(created["id"], display_name=f"SDK example {ts} (updated)"),
            lambda r: f"displayName: {r['displayName']!r}",
        )


def section4_domains() -> None:
    header(4, "Domains")

    lst = try_call("domains.list({ limit: 5 })", lambda: mi.domains.list(limit=5), lambda r: f"{r['total']} total")

    if lst and lst["data"]:
        state["first_domain_id"] = lst["data"][0]["id"]
        state["first_domain_name"] = lst["data"][0]["domainName"]

    try_call("domains.getStatistics()", lambda: mi.domains.get_statistics(), lambda r: f"{r['verifiedDomains']}/{r['totalDomains']} verified")

    domain_to_read = test_domain or state["first_domain_name"]
    if domain_to_read:
        try_call(
            f"domains.getByName('{domain_to_read}')",
            lambda: mi.domains.get_by_name(domain_to_read),
            lambda r: f"{len(r['dnsRecords'])} DNS record(s) published",
        )
        try_call(
            f"domains.getAdminMailboxes('{domain_to_read}')",
            lambda: mi.domains.get_admin_mailboxes(domain_to_read),
            lambda r: f"{len(r['mailboxes'])} admin mailbox(es)",
        )
    else:
        skip("getByName/getAdminMailboxes (no domain)")

    if state["first_domain_id"]:
        try_call(
            f"domains.get('{short(state['first_domain_id'])}')",
            lambda: mi.domains.get(state["first_domain_id"]),
            lambda r: f"domainName={r['domainName']}, verificationState={r['verificationState']}",
        )

    try_call("domains.exportCsv({ limit: 5 })", lambda: mi.domains.export_csv(limit=5), lambda r: f"{r.count(chr(10))} row(s) of CSV")

    if not is_full or not test_domain:
        skip("bulkCreate/verify/pushDns/repush/delete (safe mode or MI_TEST_DOMAIN unset)")
        return

    a = f"sdk-example-{ts}-a.{test_domain}"
    b = f"sdk-example-{ts}-b.{test_domain}"
    bulk = try_call(
        f"domains.bulkCreate([{a}, {b}])",
        lambda: mi.domains.bulk_create(domains=[{"domainName": a}, {"domainName": b}]),
        lambda r: f"taskId: {short(r['taskId'])}",
    )

    if bulk:
        state["first_task_id"] = bulk["taskId"]
        state["created_domains"] = [a, b]
        cleanup.append((
            f"domains.bulkDelete([{a}, {b}])",
            lambda: mi.domains.bulk_delete(domain_names=[a, b]),
        ))

        try_call(
            f"tasks.waitFor('{short(bulk['taskId'])}')",
            lambda: mi.tasks.wait_for(bulk["taskId"], poll_interval=3.0, timeout=60.0),
            lambda r: f"status={r['status']}",
        )

        try_call(f"domains.verify('{a}')", lambda: mi.domains.verify(a), lambda r: f"fullyVerified={r['fullyVerified']}")
        try_call(
            f"domains.bulkVerify([{a}, {b}])",
            lambda: mi.domains.bulk_verify(domain_names=[a, b]),
            lambda r: f"taskId: {short(r['taskId'])}",
        )
        try_call(f"domains.pushDns('{a}')", lambda: mi.domains.push_dns(a), lambda r: f"{len(r['dnsRecords'])} records")
        try_call(
            f"domains.bulkPushDns([{a}])",
            lambda: mi.domains.bulk_push_dns(domain_names=[a]),
            lambda r: f"taskId: {short(r['taskId'])}",
        )
        try_call(f"domains.repushDns('{a}')", lambda: mi.domains.repush_dns(a), lambda r: f"dmarcApplied={r['customDmarcApplied']}")
        try_call(
            f"domains.bulkRepushDns([{a}])",
            lambda: mi.domains.bulk_repush_dns(domain_names=[a]),
            lambda r: f"taskId: {short(r['taskId'])}",
        )

    print("  (domains.cleanDns intentionally not called — see README)")


def section5_redirects() -> None:
    header(5, "Domain redirects")
    try_call("domains.redirects.getDnsConfig()", lambda: mi.domains.redirects.get_dns_config(), lambda r: f"ip={r['ipAddress']}")

    read_domain = test_redirect_domain or test_domain or state["first_domain_name"]
    if read_domain:
        try_call(
            f"domains.redirects.get('{read_domain}')",
            lambda: mi.domains.redirects.get(read_domain),
            lambda r: f"redirect → {r['redirect']['redirectUrl']}" if r.get("hasRedirect") else "no redirect set",
        )
    else:
        skip("redirects.get (no domain)")

    if not is_full or not test_redirect_domain:
        skip("setup/pushDns/verifyDns/events/delete (needs MI_TEST_REDIRECT_DOMAIN)")
        return

    setup = try_call(
        f"redirects.setup('{test_redirect_domain}', → https://example.com)",
        lambda: mi.domains.redirects.setup(test_redirect_domain, redirect_url="https://example.com", force_https=True),
        lambda r: f"action={r['action']}",
    )
    if setup:
        cleanup.append((
            f"redirects.delete('{test_redirect_domain}')",
            lambda: mi.domains.redirects.delete(test_redirect_domain),
        ))
        try_call(f"redirects.pushDns('{test_redirect_domain}')", lambda: mi.domains.redirects.push_dns(test_redirect_domain), lambda r: f"dnsPushed={r['dnsPushed']}")
        try_call(f"redirects.verifyDns('{test_redirect_domain}')", lambda: mi.domains.redirects.verify_dns(test_redirect_domain), lambda r: f"dnsStatus={r['dnsStatus']}")
        try_call(f"redirects.getEvents('{test_redirect_domain}')", lambda: mi.domains.redirects.get_events(test_redirect_domain, 5), lambda r: f"{r['totalEvents']} event(s)")


def section6_projects() -> None:
    header(6, "Projects")
    projs = try_call("projects.list()", lambda: mi.projects.list(), lambda r: f"{len(r)} project(s)")
    if projs:
        state["first_project_id"] = projs[0]["id"]
        try_call(
            f"projects.get('{short(state['first_project_id'])}')",
            lambda: mi.projects.get(state["first_project_id"]),
            lambda r: f"{r['name']} ({r['domainsCount']} domains)",
        )

    if not is_full:
        skip("create/update/assignDomains/delete (safe mode)")
        return

    project_name = f"SDK example {ts}"
    p = try_call(
        f"projects.create('{project_name}')",
        lambda: mi.projects.create(name=project_name),
        lambda r: f"id: {short(r['id'])}",
    )

    if p:
        cleanup.append((
            f"projects.delete('{short(p['id'])}')",
            lambda: mi.projects.delete(p["id"]),
        ))
        try_call(
            f"projects.update('{short(p['id'])}')",
            lambda: mi.projects.update(p["id"], name=f"{project_name} (updated)"),
            lambda r: f"name: {r['name']}",
        )

        if state["created_domains"]:
            try_call(
                f"projects.assignDomains('{short(p['id'])}', {len(state['created_domains'])} domain(s))",
                lambda: mi.projects.assign_domains(p["id"], domain_names=state["created_domains"]),
                lambda r: f"assigned {r['successful']}, failed {r['failed']}",
            )
        else:
            skip("assignDomains (no test domains)")


def section7_analytics() -> None:
    header(7, "Analytics")
    try_call(
        "analytics.getOverview()",
        lambda: mi.analytics.get_overview(),
        lambda r: f"{r['currentMonth']['emailsSent']} sent this month ({r['domains']} domains)",
    )
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=7)
    try_call(
        "analytics.getActivityGraph(daily, last 7 days)",
        lambda: mi.analytics.get_activity_graph(
            granularity="daily",
            start_date=start.isoformat(),
            end_date=end.isoformat(),
            counters=["outgoing", "bounces"],
        ),
        lambda r: f"{len(r['dataPoints'])} data point(s), total outgoing {r['summary'].get('totalOutgoing', 0)}",
    )


def section8_tasks() -> None:
    header(8, "Tasks")
    lst = try_call("tasks.list({ limit: 5 })", lambda: mi.tasks.list(limit=5), lambda r: f"{r['total']} total")

    tid = state["first_task_id"] or (lst["tasks"][0]["id"] if lst and lst["tasks"] else None)
    if tid:
        try_call(f"tasks.get('{short(tid)}')", lambda: mi.tasks.get(tid), lambda r: f"status={r['status']}, progress={r['progress']}%")
        try_call(f"tasks.getOutputs('{short(tid)}')", lambda: mi.tasks.get_outputs(tid), lambda r: f"{len(r['outputs'])} log line(s)")
    else:
        skip("tasks.get / getOutputs (no task id)")

    try_call("tasks.getStatsSummary()", lambda: mi.tasks.get_stats_summary(), lambda r: f"pending={r['pendingTasks']}, done={r['completedTasks']}")

    if not is_full or not test_domain:
        skip("cancel demo (safe mode or MI_TEST_DOMAIN unset)")
        return

    spawned = try_call(
        "tasks.cancel demo — spawn a bulkVerify then cancel it",
        lambda: mi.domains.bulk_verify(domain_names=[test_domain]),
        lambda r: f"spawned {short(r['taskId'])}",
    )
    if spawned:
        try_call(
            f"tasks.cancel('{short(spawned['taskId'])}')",
            lambda: mi.tasks.cancel(spawned["taskId"]),
            lambda r: f"status={r['status']}",
        )


def section9_send() -> None:
    header(9, "Emails — send + inspect")
    if not is_full:
        skip("entire section (safe mode)")
        return

    # Note: the parameter is spelled `from_` (trailing underscore) because
    # `from` is a reserved keyword in Python. It's mapped to `from` on the wire.
    sent = try_call(
        f"emails.send(from={test_sender}, to={test_to})",
        lambda: mi.emails.send(
            from_=test_sender,
            to=test_to,
            subject=f"MissionInbox SDK example — {datetime.now(timezone.utc).isoformat()}",
            html=f"<p>This is a test send from the MissionInbox Python SDK example.</p><p>Run id: {ts}</p>",
            text=f"MissionInbox Python SDK example test send. Run id: {ts}.",
            tag="sdk-example",
        ),
        lambda r: f"id: {r['id']}",
    )
    if not sent:
        return

    last_id = str(sent["id"])

    details = try_call(
        f"emails.getDetails('{last_id}', [properties, activity])",
        lambda: mi.emails.get_details(last_id, include=["properties", "activity"]),
        lambda r: f"subject={r['message']['properties'].get('subject', 'n/a')}",
    )

    rfc822 = details and details.get("message", {}).get("properties", {}).get("message_id")
    if rfc822:
        try_call(
            f"emails.getStatus('{short(rfc822)}')",
            lambda: mi.emails.get_status(rfc822),
            lambda r: f"status={r['status']}, bounce={r['bounce']}",
        )
        try_call(
            f"emails.getBulkStatus(['{short(rfc822)}'])",
            lambda: mi.emails.get_bulk_status([rfc822]),
            lambda r: f"{sum(1 for s in r['statuses'] if s)}/{len(r['statuses'])} found",
        )
    else:
        skip("getStatus / getBulkStatus (Message-ID header not available yet)")

    # Raw MIME is assembled asynchronously — for very-fresh sends the API
    # commonly returns {"status": "error"} until assembly finishes.
    try_call(
        f"emails.getRaw('{last_id}')",
        lambda: mi.emails.get_raw(last_id),
        lambda r: f"{len(r['raw_data'])} bytes" if r.get("raw_data") else f"status={r['status']}",
    )
    try_call(
        "emails.search({ from: <sender>, limit: 5 })",
        lambda: mi.emails.search(from_=test_sender, limit=5),
        lambda r: f"{len(r['data'])} hit(s), total {r['total']}",
    )


def section10_queue() -> None:
    header(10, "Email queue")
    q = try_call("emailQueue.list({ limit: 5 })", lambda: mi.email_queue.list(limit=5), lambda r: f"{r['total']} total")

    if not is_full:
        skip("retry/cancel (safe mode)")
        return
    if not q or not q["data"]:
        skip("retry/cancel (queue is empty)")
        return
    ids = ", ".join(short(item["id"]) for item in q["data"][:3])
    print(f"  (queue has items — retry/cancel skipped; ids: {ids})")


def section11_errors() -> None:
    header(11, "Error hierarchy demos")

    bad = MissionInbox(api_key="obviously-wrong-key", base_url=base_url, max_retries=0)
    try:
        bad.emails.get_send_limit()
        line("emails.getSendLimit with bad key", "unexpectedly succeeded")
    except AuthenticationError as e:
        line("AuthenticationError (401)", f"caught: {str(e)[:60]}")
    except MissionInboxError as e:
        line("MissionInboxError (unexpected)", f"status={e.status}: {str(e)[:60]}")
    except Exception as e:
        fail("bad-key call", e)

    if is_full and test_to:
        try:
            mi.emails.send(
                from_=f"never-registered-{ts}@example.invalid",
                to=test_to,
                subject="this should fail",
                text="this should fail",
            )
            line("emails.send with unregistered from", "unexpectedly succeeded")
        except UnregisteredSenderError as e:
            line("UnregisteredSenderError (403)", f"caught: {str(e)[:60]}")
        except MissionInboxError as e:
            line(f"{type(e).__name__} ({e.status})", str(e)[:60])
        except Exception as e:
            fail("unregistered-sender call", e)
    else:
        skip("unregistered-sender demo (safe mode or MI_TEST_TO unset)")


def run_cleanup() -> None:
    if not cleanup:
        return
    header(99, "Cleanup")
    for label, fn in reversed(cleanup):
        try:
            fn()
            line(label, "ok")
        except Exception as e:
            fail(label, e)


def main() -> None:
    print(f"MissionInbox SDK example — mode={mode}, base={base_url}")
    if is_full:
        print(f"  sender={test_sender}, recipient={test_to}, testDomain={test_domain}")

    try:
        section1_health()
        section2_send_limit()
        section3_identifiers()
        section4_domains()
        section5_redirects()
        section6_projects()
        section7_analytics()
        section8_tasks()
        section9_send()
        section10_queue()
        section11_errors()
    finally:
        run_cleanup()

    print("\nDone.")


if __name__ == "__main__":
    main()
