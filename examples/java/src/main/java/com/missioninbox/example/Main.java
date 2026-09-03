package com.missioninbox.example;

import com.missioninbox.MissionInbox;
import com.missioninbox.exceptions.AuthenticationException;
import com.missioninbox.exceptions.MissionInboxException;
import com.missioninbox.exceptions.UnregisteredSenderException;
import io.github.cdimascio.dotenv.Dotenv;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * MissionInbox Java SDK — end-to-end walk-through.
 *
 * Ports the Node/PHP/Python examples section-for-section. Set MI_EXAMPLE_MODE=full
 * to exercise destructive endpoints; every resource created is deleted at exit.
 */
public final class Main {

    private static final Dotenv DOTENV = Dotenv.configure().ignoreIfMissing().load();

    private static String env(String key, String fallback) {
        String v = System.getenv(key);
        if (v == null || v.isEmpty()) v = DOTENV.get(key);
        return (v == null || v.isEmpty()) ? fallback : v;
    }

    private static String env(String key) {
        return env(key, "");
    }

    private static final String API_KEY = env("MI_API_KEY");
    private static final String BASE_URL = env("MI_API_URL");
    private static final String MODE = env("MI_EXAMPLE_MODE", "safe").toLowerCase();
    private static final String TEST_SENDER = env("MI_TEST_SENDER");
    private static final String TEST_TO = env("MI_TEST_TO");
    private static final String TEST_DOMAIN = env("MI_TEST_DOMAIN");
    private static final String TEST_REDIRECT_DOMAIN = env("MI_TEST_REDIRECT_DOMAIN");

    private static final long TS = System.currentTimeMillis();

    private static MissionInbox mi;
    private static boolean isFull;
    private static String testSenderDomain = "";
    private static final List<Cleanup> CLEANUP = new ArrayList<>();

    // State passed between sections
    private static String firstDomainId;
    private static String firstDomainName;
    private static String firstIdentifierId;
    private static String firstProjectId;
    private static String firstTaskId;
    private static List<String> createdDomains = new ArrayList<>();

    public static void main(String[] args) {
        if (API_KEY.isEmpty()) exitMissing("MI_API_KEY");
        if (BASE_URL.isEmpty()) exitMissing("MI_API_URL");
        if (!MODE.equals("safe") && !MODE.equals("full")) {
            System.err.println("MI_EXAMPLE_MODE must be 'safe' or 'full' (got '" + MODE + "')");
            System.exit(2);
        }
        isFull = MODE.equals("full");
        if (isFull) {
            List<String> missing = new ArrayList<>();
            if (TEST_SENDER.isEmpty()) missing.add("MI_TEST_SENDER");
            if (TEST_TO.isEmpty()) missing.add("MI_TEST_TO");
            if (TEST_DOMAIN.isEmpty()) missing.add("MI_TEST_DOMAIN");
            if (!missing.isEmpty()) {
                System.err.println("Full mode requires: " + String.join(", ", missing));
                System.exit(2);
            }
        }
        if (TEST_SENDER.contains("@")) {
            testSenderDomain = TEST_SENDER.substring(TEST_SENDER.indexOf('@') + 1);
        }

        mi = MissionInbox.builder()
                .apiKey(API_KEY)
                .baseUrl(BASE_URL)
                .build();

        System.out.println("MissionInbox SDK example — mode=" + MODE + ", base=" + BASE_URL);
        if (isFull) System.out.println("  sender=" + TEST_SENDER + ", recipient=" + TEST_TO + ", testDomain=" + TEST_DOMAIN);

        try {
            section1Health();
            section2SendLimit();
            section3Identifiers();
            section4Domains();
            section5Redirects();
            section6Projects();
            section7Analytics();
            section8Tasks();
            section9Send();
            section10Queue();
            section11Errors();
        } finally {
            runCleanup();
        }

        System.out.println("\nDone.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Output helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static void header(int n, String title) {
        System.out.println("\n━━━ " + n + ". " + title + " ━━━");
    }

    private static void line(String action, String result) {
        String pad = action.length() < 44 ? " ".repeat(44 - action.length()) : " ";
        System.out.println("  → " + action + pad + result);
    }

    private static void skip(String reason) {
        System.out.println("  ~ skipped: " + reason);
    }

    private static void fail(String action, Throwable err) {
        String name = err.getClass().getSimpleName();
        String msg = err.getMessage() == null ? "" : err.getMessage();
        if (msg.length() > 80) msg = msg.substring(0, 80);
        String pad = action.length() < 44 ? " ".repeat(44 - action.length()) : " ";
        System.out.println("  ✗ " + action + pad + name + ": " + msg);
    }

    private static String shortId(Object v) {
        String s = String.valueOf(v);
        return s.length() > 12 ? s.substring(0, 8) + "…" : s;
    }

    private static void exitMissing(String key) {
        System.err.println("Missing " + key + ". Copy .env.example to .env and fill it in.");
        System.exit(2);
    }

    @FunctionalInterface
    private interface Cleanup {
        void run();
        default String label() { return ""; }
    }

    @SuppressWarnings("unchecked")
    private static <T> T tryCall(String action, Supplier<T> fn, Function<T, String> fmt) {
        try {
            T result = fn.get();
            line(action, fmt == null ? "ok" : fmt.apply(result));
            return result;
        } catch (Throwable err) {
            fail(action, err);
            return null;
        }
    }

    private static <T> T tryCall(String action, Supplier<T> fn) {
        return tryCall(action, fn, null);
    }

    private static void addCleanup(String label, Runnable fn) {
        CLEANUP.add(new Cleanup() {
            @Override public void run() { fn.run(); }
            @Override public String label() { return label; }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sections
    // ─────────────────────────────────────────────────────────────────────────

    private static void section1Health() {
        header(1, "Health check");
        tryCall("health.check()", () -> mi.health.check(), r -> r instanceof String ? (String) r : String.valueOf(r));
    }

    @SuppressWarnings("unchecked")
    private static void section2SendLimit() {
        header(2, "Send-limit status");
        tryCall("emails.getSendLimit()", () -> mi.emails.getSendLimit(), r -> {
            Boolean limited = (Boolean) r.get("limited");
            if (Boolean.TRUE.equals(limited)) {
                Map<String, Object> d = (Map<String, Object>) r.get("daily");
                Map<String, Object> m = (Map<String, Object>) r.get("monthly");
                return "limited (daily " + d.get("sent") + "/" + d.get("limit") + ", monthly " + m.get("sent") + "/" + m.get("limit") + ")";
            }
            return "unlimited (paid plan)";
        });
    }

    @SuppressWarnings("unchecked")
    private static void section3Identifiers() {
        header(3, "Sending identifiers");
        List<Map<String, Object>> ids = tryCall(
                "sendingIdentifiers.list()",
                () -> mi.sendingIdentifiers.list(),
                r -> r.size() + " identifier(s)");

        if (ids != null && !ids.isEmpty()) {
            firstIdentifierId = (String) ids.get(0).get("id");
            tryCall(
                    "sendingIdentifiers.get('" + shortId(firstIdentifierId) + "')",
                    () -> mi.sendingIdentifiers.get(firstIdentifierId),
                    r -> r.get("emailAddress") + " (canSend: " + r.get("canSend") + ")");
        }

        if (!isFull) { skip("create/update/delete (safe mode)"); return; }
        if (testSenderDomain.isEmpty()) { skip("create/update/delete (MI_TEST_SENDER has no domain part)"); return; }

        String tempAddress = "sdk-example-" + TS + "@" + testSenderDomain;
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("emailAddress", tempAddress);
        params.put("displayName", "SDK example — safe to delete");
        Map<String, Object> created = tryCall(
                "sendingIdentifiers.create('" + tempAddress + "')",
                () -> mi.sendingIdentifiers.create(params),
                r -> "id: " + shortId(r.get("id")));

        if (created != null) {
            String id = (String) created.get("id");
            addCleanup(
                    "sendingIdentifiers.delete('" + shortId(id) + "')",
                    () -> mi.sendingIdentifiers.delete(id));

            tryCall(
                    "sendingIdentifiers.update('" + shortId(id) + "')",
                    () -> mi.sendingIdentifiers.update(id, Collections.singletonMap("displayName", "SDK example " + TS + " (updated)")),
                    r -> "displayName: " + r.get("displayName"));
        }
    }

    @SuppressWarnings("unchecked")
    private static void section4Domains() {
        header(4, "Domains");

        Map<String, Object> list = tryCall(
                "domains.list({ limit: 5 })",
                () -> mi.domains.list(Collections.singletonMap("limit", 5)),
                r -> r.get("total") + " total");

        if (list != null) {
            List<Map<String, Object>> data = (List<Map<String, Object>>) list.get("data");
            if (data != null && !data.isEmpty()) {
                firstDomainId = (String) data.get(0).get("id");
                firstDomainName = (String) data.get(0).get("domainName");
            }
        }

        tryCall("domains.getStatistics()", () -> mi.domains.getStatistics(),
                r -> r.get("verifiedDomains") + "/" + r.get("totalDomains") + " verified");

        String domainToRead = !TEST_DOMAIN.isEmpty() ? TEST_DOMAIN : firstDomainName;
        if (domainToRead != null) {
            final String d = domainToRead;
            tryCall(
                    "domains.getByName('" + d + "')",
                    () -> mi.domains.getByName(d),
                    r -> ((List<?>) r.get("dnsRecords")).size() + " DNS record(s) published");
            tryCall(
                    "domains.getAdminMailboxes('" + d + "')",
                    () -> mi.domains.getAdminMailboxes(d),
                    r -> ((List<?>) r.get("mailboxes")).size() + " admin mailbox(es)");
        } else {
            skip("getByName/getAdminMailboxes (no domain)");
        }

        if (firstDomainId != null) {
            tryCall(
                    "domains.get('" + shortId(firstDomainId) + "')",
                    () -> mi.domains.get(firstDomainId),
                    r -> "domainName=" + r.get("domainName") + ", verificationState=" + r.get("verificationState"));
        }

        tryCall(
                "domains.exportCsv({ limit: 5 })",
                () -> mi.domains.exportCsv(Collections.singletonMap("limit", 5)),
                r -> (r.split("\n").length - 1) + " row(s) of CSV");

        if (!isFull || TEST_DOMAIN.isEmpty()) {
            skip("bulkCreate/verify/pushDns/repush/delete (safe mode or MI_TEST_DOMAIN unset)");
            return;
        }

        String testA = "sdk-example-" + TS + "-a." + TEST_DOMAIN;
        String testB = "sdk-example-" + TS + "-b." + TEST_DOMAIN;

        List<Map<String, Object>> newDomains = new ArrayList<>();
        newDomains.add(Collections.singletonMap("domainName", testA));
        newDomains.add(Collections.singletonMap("domainName", testB));

        Map<String, Object> bulk = tryCall(
                "domains.bulkCreate([" + testA + ", " + testB + "])",
                () -> mi.domains.bulkCreate(newDomains),
                r -> "taskId: " + shortId(r.get("taskId")));

        if (bulk != null) {
            firstTaskId = (String) bulk.get("taskId");
            createdDomains = Arrays.asList(testA, testB);
            final List<String> toDelete = new ArrayList<>(createdDomains);
            addCleanup(
                    "domains.bulkDelete([" + testA + ", " + testB + "])",
                    () -> mi.domains.bulkDelete(toDelete));

            final String taskId = firstTaskId;
            tryCall(
                    "tasks.waitFor('" + shortId(taskId) + "')",
                    () -> mi.tasks.waitFor(taskId, 3_000, 60_000, null),
                    r -> "status=" + r.get("status"));

            tryCall("domains.verify('" + testA + "')", () -> mi.domains.verify(testA), r -> "fullyVerified=" + r.get("fullyVerified"));
            tryCall(
                    "domains.bulkVerify([" + testA + ", " + testB + "])",
                    () -> mi.domains.bulkVerify(Arrays.asList(testA, testB)),
                    r -> "taskId: " + shortId(r.get("taskId")));
            tryCall("domains.pushDns('" + testA + "')", () -> mi.domains.pushDns(testA),
                    r -> ((List<?>) r.get("dnsRecords")).size() + " records");
            tryCall(
                    "domains.bulkPushDns([" + testA + "])",
                    () -> mi.domains.bulkPushDns(Collections.singletonList(testA)),
                    r -> "taskId: " + shortId(r.get("taskId")));
            tryCall("domains.repushDns('" + testA + "')", () -> mi.domains.repushDns(testA),
                    r -> "dmarcApplied=" + r.get("customDmarcApplied"));
            tryCall(
                    "domains.bulkRepushDns([" + testA + "])",
                    () -> mi.domains.bulkRepushDns(Collections.singletonList(testA)),
                    r -> "taskId: " + shortId(r.get("taskId")));
        }

        System.out.println("  (domains.cleanDns intentionally not called — see README)");
    }

    @SuppressWarnings("unchecked")
    private static void section5Redirects() {
        header(5, "Domain redirects");
        tryCall("domains.redirects.getDnsConfig()", () -> mi.domains.redirects.getDnsConfig(),
                r -> "ip=" + r.get("ipAddress"));

        String readDomain = !TEST_REDIRECT_DOMAIN.isEmpty() ? TEST_REDIRECT_DOMAIN
                : !TEST_DOMAIN.isEmpty() ? TEST_DOMAIN
                : firstDomainName;
        if (readDomain != null) {
            final String d = readDomain;
            tryCall(
                    "domains.redirects.get('" + d + "')",
                    () -> mi.domains.redirects.get(d),
                    r -> Boolean.TRUE.equals(r.get("hasRedirect"))
                            ? "redirect → " + ((Map<String, Object>) r.get("redirect")).get("redirectUrl")
                            : "no redirect set");
        } else {
            skip("redirects.get (no domain)");
        }

        if (!isFull || TEST_REDIRECT_DOMAIN.isEmpty()) {
            skip("setup/pushDns/verifyDns/events/delete (needs MI_TEST_REDIRECT_DOMAIN)");
            return;
        }

        Map<String, Object> setupParams = new LinkedHashMap<>();
        setupParams.put("redirectUrl", "https://example.com");
        setupParams.put("forceHttps", true);
        Map<String, Object> setup = tryCall(
                "redirects.setup('" + TEST_REDIRECT_DOMAIN + "', → https://example.com)",
                () -> mi.domains.redirects.setup(TEST_REDIRECT_DOMAIN, setupParams),
                r -> "action=" + r.get("action"));

        if (setup != null) {
            addCleanup(
                    "redirects.delete('" + TEST_REDIRECT_DOMAIN + "')",
                    () -> mi.domains.redirects.delete(TEST_REDIRECT_DOMAIN));
            tryCall("redirects.pushDns('" + TEST_REDIRECT_DOMAIN + "')",
                    () -> mi.domains.redirects.pushDns(TEST_REDIRECT_DOMAIN),
                    r -> "dnsPushed=" + r.get("dnsPushed"));
            tryCall("redirects.verifyDns('" + TEST_REDIRECT_DOMAIN + "')",
                    () -> mi.domains.redirects.verifyDns(TEST_REDIRECT_DOMAIN),
                    r -> "dnsStatus=" + r.get("dnsStatus"));
            tryCall("redirects.getEvents('" + TEST_REDIRECT_DOMAIN + "')",
                    () -> mi.domains.redirects.getEvents(TEST_REDIRECT_DOMAIN, 5),
                    r -> r.get("totalEvents") + " event(s)");
        }
    }

    @SuppressWarnings("unchecked")
    private static void section6Projects() {
        header(6, "Projects");
        List<Map<String, Object>> projects = tryCall(
                "projects.list()",
                () -> mi.projects.list(),
                r -> r.size() + " project(s)");

        if (projects != null && !projects.isEmpty()) {
            firstProjectId = (String) projects.get(0).get("id");
            tryCall(
                    "projects.get('" + shortId(firstProjectId) + "')",
                    () -> mi.projects.get(firstProjectId),
                    r -> r.get("name") + " (" + r.get("domainsCount") + " domains)");
        }

        if (!isFull) { skip("create/update/assignDomains/delete (safe mode)"); return; }

        String projectName = "SDK example " + TS;
        Map<String, Object> p = tryCall(
                "projects.create('" + projectName + "')",
                () -> mi.projects.create(Collections.singletonMap("name", projectName)),
                r -> "id: " + shortId(r.get("id")));

        if (p != null) {
            String id = (String) p.get("id");
            addCleanup(
                    "projects.delete('" + shortId(id) + "')",
                    () -> mi.projects.delete(id));

            tryCall(
                    "projects.update('" + shortId(id) + "')",
                    () -> mi.projects.update(id, Collections.singletonMap("name", projectName + " (updated)")),
                    r -> "name: " + r.get("name"));

            if (!createdDomains.isEmpty()) {
                final List<String> domains = createdDomains;
                tryCall(
                        "projects.assignDomains('" + shortId(id) + "', " + domains.size() + " domain(s))",
                        () -> mi.projects.assignDomains(id, domains),
                        r -> "assigned " + r.get("successful") + ", failed " + r.get("failed"));
            } else {
                skip("assignDomains (no test domains)");
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static void section7Analytics() {
        header(7, "Analytics");
        tryCall(
                "analytics.getOverview()",
                () -> mi.analytics.getOverview(),
                r -> {
                    Map<String, Object> curMonth = (Map<String, Object>) r.get("currentMonth");
                    return curMonth.get("emailsSent") + " sent this month (" + r.get("domains") + " domains)";
                });

        Instant end = Instant.now();
        Instant start = end.minus(7, ChronoUnit.DAYS);
        tryCall(
                "analytics.getActivityGraph(daily, last 7 days)",
                () -> mi.analytics.getActivityGraph(
                        "daily", start.toString(), end.toString(),
                        Arrays.asList("outgoing", "bounces")),
                r -> {
                    List<?> pts = (List<?>) r.get("dataPoints");
                    Map<String, Object> sum = (Map<String, Object>) r.get("summary");
                    Object total = sum != null ? sum.getOrDefault("totalOutgoing", 0) : 0;
                    return pts.size() + " data point(s), total outgoing " + total;
                });
    }

    @SuppressWarnings("unchecked")
    private static void section8Tasks() {
        header(8, "Tasks");
        Map<String, Object> list = tryCall(
                "tasks.list({ limit: 5 })",
                () -> mi.tasks.list(Collections.singletonMap("limit", 5)),
                r -> r.get("total") + " total");

        String taskId = firstTaskId;
        if (taskId == null && list != null) {
            List<Map<String, Object>> tasks = (List<Map<String, Object>>) list.get("tasks");
            if (tasks != null && !tasks.isEmpty()) taskId = (String) tasks.get(0).get("id");
        }
        if (taskId != null) {
            final String t = taskId;
            tryCall("tasks.get('" + shortId(t) + "')", () -> mi.tasks.get(t),
                    r -> "status=" + r.get("status") + ", progress=" + r.get("progress") + "%");
            tryCall("tasks.getOutputs('" + shortId(t) + "')", () -> mi.tasks.getOutputs(t),
                    r -> ((List<?>) r.get("outputs")).size() + " log line(s)");
        } else {
            skip("tasks.get / getOutputs (no task id)");
        }

        tryCall("tasks.getStatsSummary()", () -> mi.tasks.getStatsSummary(),
                r -> "pending=" + r.get("pendingTasks") + ", done=" + r.get("completedTasks"));

        if (!isFull || TEST_DOMAIN.isEmpty()) {
            skip("cancel demo (safe mode or MI_TEST_DOMAIN unset)");
            return;
        }

        Map<String, Object> spawn = tryCall(
                "tasks.cancel demo — spawn a bulkVerify then cancel it",
                () -> mi.domains.bulkVerify(Collections.singletonList(TEST_DOMAIN)),
                r -> "spawned " + shortId(r.get("taskId")));
        if (spawn != null) {
            final String cancelId = (String) spawn.get("taskId");
            tryCall(
                    "tasks.cancel('" + shortId(cancelId) + "')",
                    () -> mi.tasks.cancel(cancelId),
                    r -> "status=" + r.get("status"));
        }
    }

    @SuppressWarnings("unchecked")
    private static void section9Send() {
        header(9, "Emails — send + inspect");
        if (!isFull) { skip("entire section (safe mode)"); return; }

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("from", TEST_SENDER);
        params.put("to", TEST_TO);
        params.put("subject", "MissionInbox SDK example — " + Instant.now().toString());
        params.put("html", "<p>This is a test send from the MissionInbox Java SDK example.</p><p>Run id: " + TS + "</p>");
        params.put("text", "MissionInbox Java SDK example test send. Run id: " + TS + ".");
        params.put("tag", "sdk-example");

        Map<String, Object> sent = tryCall(
                "emails.send(from=" + TEST_SENDER + ", to=" + TEST_TO + ")",
                () -> mi.emails.send(params),
                r -> "id: " + r.get("id"));
        if (sent == null) return;

        String lastId = String.valueOf(sent.get("id"));

        Map<String, Object> details = tryCall(
                "emails.getDetails('" + lastId + "', [properties, activity])",
                () -> mi.emails.getDetails(lastId, Arrays.asList("properties", "activity")),
                r -> {
                    Map<String, Object> msg = (Map<String, Object>) r.get("message");
                    Map<String, Object> props = msg != null ? (Map<String, Object>) msg.get("properties") : null;
                    return "subject=" + (props != null ? props.get("subject") : "n/a");
                });

        String rfc822 = null;
        if (details != null) {
            Map<String, Object> msg = (Map<String, Object>) details.get("message");
            if (msg != null) {
                Map<String, Object> props = (Map<String, Object>) msg.get("properties");
                if (props != null) rfc822 = (String) props.get("message_id");
            }
        }

        if (rfc822 != null) {
            final String r822 = rfc822;
            tryCall(
                    "emails.getStatus('" + shortId(r822) + "')",
                    () -> mi.emails.getStatus(r822),
                    r -> "status=" + r.get("status") + ", bounce=" + r.get("bounce"));
            tryCall(
                    "emails.getBulkStatus(['" + shortId(r822) + "'])",
                    () -> mi.emails.getBulkStatus(Collections.singletonList(r822)),
                    r -> {
                        List<?> statuses = (List<?>) r.get("statuses");
                        long found = statuses.stream().filter(s -> s != null).count();
                        return found + "/" + statuses.size() + " found";
                    });
        } else {
            skip("getStatus / getBulkStatus (Message-ID header not available yet)");
        }

        tryCall(
                "emails.getRaw('" + lastId + "')",
                () -> mi.emails.getRaw(lastId),
                r -> r.get("raw_data") != null ? ((String) r.get("raw_data")).length() + " bytes"
                        : "status=" + r.get("status"));
        Map<String, Object> searchParams = new LinkedHashMap<>();
        searchParams.put("from", TEST_SENDER);
        searchParams.put("limit", 5);
        tryCall(
                "emails.search({ from: <sender>, limit: 5 })",
                () -> mi.emails.search(searchParams),
                r -> ((List<?>) r.get("data")).size() + " hit(s), total " + r.get("total"));
    }

    @SuppressWarnings("unchecked")
    private static void section10Queue() {
        header(10, "Email queue");
        Map<String, Object> q = tryCall(
                "emailQueue.list({ limit: 5 })",
                () -> mi.emailQueue.list(Collections.singletonMap("limit", 5)),
                r -> r.get("total") + " total");

        if (!isFull) { skip("retry/cancel (safe mode)"); return; }

        List<Map<String, Object>> data = q == null ? null : (List<Map<String, Object>>) q.get("data");
        if (data == null || data.isEmpty()) {
            skip("retry/cancel (queue is empty)");
            return;
        }
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < Math.min(3, data.size()); i++) {
            if (i > 0) ids.append(", ");
            ids.append(shortId(data.get(i).get("id")));
        }
        System.out.println("  (queue has items — retry/cancel skipped; ids: " + ids + ")");
    }

    private static void section11Errors() {
        header(11, "Error hierarchy demos");

        MissionInbox badKey = MissionInbox.builder()
                .apiKey("obviously-wrong-key")
                .baseUrl(BASE_URL)
                .maxRetries(0)
                .build();
        try {
            badKey.emails.getSendLimit();
            line("emails.getSendLimit with bad key", "unexpectedly succeeded");
        } catch (AuthenticationException e) {
            line("AuthenticationException (401)", "caught: " + truncate(e.getMessage()));
        } catch (MissionInboxException e) {
            line("MissionInboxException (unexpected)", "status=" + e.getStatus() + ": " + truncate(e.getMessage()));
        } catch (Throwable e) {
            fail("bad-key call", e);
        }

        if (isFull && !TEST_TO.isEmpty()) {
            try {
                Map<String, Object> params = new LinkedHashMap<>();
                params.put("from", "never-registered-" + TS + "@example.invalid");
                params.put("to", TEST_TO);
                params.put("subject", "this should fail");
                params.put("text", "this should fail");
                mi.emails.send(params);
                line("emails.send with unregistered from", "unexpectedly succeeded");
            } catch (UnregisteredSenderException e) {
                line("UnregisteredSenderException (403)", "caught: " + truncate(e.getMessage()));
            } catch (MissionInboxException e) {
                line(e.getClass().getSimpleName() + " (" + e.getStatus() + ")", truncate(e.getMessage()));
            } catch (Throwable e) {
                fail("unregistered-sender call", e);
            }
        } else {
            skip("unregistered-sender demo (safe mode or MI_TEST_TO unset)");
        }
    }

    private static String truncate(String s) {
        if (s == null) return "";
        return s.length() > 60 ? s.substring(0, 60) : s;
    }

    private static void runCleanup() {
        if (CLEANUP.isEmpty()) return;
        header(99, "Cleanup");
        Collections.reverse(CLEANUP);
        for (Cleanup c : CLEANUP) {
            try {
                c.run();
                line(c.label(), "ok");
            } catch (Throwable e) {
                fail(c.label(), e);
            }
        }
    }
}
