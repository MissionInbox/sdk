package com.missioninbox.example;

import com.missioninbox.MissionInbox;
import com.missioninbox.exceptions.AuthenticationException;
import com.missioninbox.exceptions.ConflictException;
import com.missioninbox.exceptions.MissionInboxException;
import com.missioninbox.exceptions.NetworkException;
import com.missioninbox.exceptions.NotFoundException;
import com.missioninbox.exceptions.UnregisteredSenderException;
import com.missioninbox.exceptions.UnverifiedDomainException;
import com.missioninbox.exceptions.ValidationException;
import io.github.cdimascio.dotenv.Dotenv;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * MissionInbox Java SDK — error catalog.
 *
 * <p>Deliberately triggers each error the SDK maps, prints the raw HTTP
 * response body observed, and verifies the SDK's exception classification.
 * Companion to {@link Main}; run via
 * {@code mvn exec:java -Dexec.mainClass=com.missioninbox.example.ErrorCatalog}.
 */
public final class ErrorCatalog {

    private static final Dotenv DOTENV = Dotenv.configure().ignoreIfMissing().load();

    private static String env(String key) {
        String v = System.getenv(key);
        if (v == null || v.isEmpty()) v = DOTENV.get(key);
        return v == null ? "" : v;
    }

    private static final String API_KEY = env("MI_API_KEY");
    private static final String BASE_URL = env("MI_API_URL");
    private static final String TEST_SENDER = env("MI_TEST_SENDER");
    private static final String TEST_TO = env("MI_TEST_TO");
    private static final String TEST_DOMAIN = env("MI_TEST_DOMAIN");
    private static final long TS = System.currentTimeMillis();

    private static final List<Result> RESULTS = new ArrayList<>();

    public static void main(String[] args) {
        if (API_KEY.isEmpty() || BASE_URL.isEmpty()) {
            System.err.println("MI_API_KEY and MI_API_URL are required.");
            System.exit(2);
        }

        MissionInbox mi = MissionInbox.builder()
                .apiKey(API_KEY)
                .baseUrl(BASE_URL)
                .maxRetries(0)
                .build();

        boolean canTrigger = !TEST_SENDER.isEmpty() && !TEST_TO.isEmpty() && !TEST_DOMAIN.isEmpty();

        System.out.println("MissionInbox error-catalog run — base=" + BASE_URL);
        if (!canTrigger) {
            System.out.println("  (MI_TEST_SENDER / TO / DOMAIN not set — will skip triggers that need them)");
        }

        // 1. AuthenticationException
        MissionInbox badKey = MissionInbox.builder()
                .apiKey("obviously-wrong-key")
                .baseUrl(BASE_URL)
                .maxRetries(0)
                .build();
        trigger(1, "wrong API key", AuthenticationException.class,
                () -> badKey.emails.getSendLimit());

        // 2. ValidationException — no recipient
        if (canTrigger) {
            Map<String, Object> params = new LinkedHashMap<>();
            params.put("from", TEST_SENDER);
            params.put("subject", "no recipient");
            params.put("text", "should fail validation");
            trigger(2, "send with no recipient", ValidationException.class,
                    () -> mi.emails.send(params));
        } else {
            System.out.println("\n━━━ 2. ValidationException: send with no recipient ━━━\n  (skipped)");
        }

        // 3. ValidationException — no body
        if (canTrigger) {
            Map<String, Object> params = new LinkedHashMap<>();
            params.put("from", TEST_SENDER);
            params.put("to", TEST_TO);
            params.put("subject", "no body");
            trigger(3, "send with no body", ValidationException.class,
                    () -> mi.emails.send(params));
        } else {
            System.out.println("\n━━━ 3. ValidationException: send with no body ━━━\n  (skipped)");
        }

        // 4. UnregisteredSenderException
        if (canTrigger) {
            Map<String, Object> params = new LinkedHashMap<>();
            params.put("from", "never-registered-" + TS + "@example.invalid");
            params.put("to", TEST_TO);
            params.put("subject", "unregistered");
            params.put("text", "should fail");
            trigger(4, "send from unregistered address", UnregisteredSenderException.class,
                    () -> mi.emails.send(params));
        } else {
            System.out.println("\n━━━ 4. UnregisteredSenderException ━━━\n  (skipped)");
        }

        // 5. NotFoundException
        trigger(5, "fetch non-existent sending identifier", NotFoundException.class,
                () -> mi.sendingIdentifiers.get("00000000-0000-0000-0000-000000000000"));

        // 6. ConflictException — register identifier twice
        if (canTrigger) {
            String senderDomain = TEST_SENDER.substring(TEST_SENDER.indexOf('@') + 1);
            String testAddr = "sdk-error-catalog-" + TS + "@" + senderDomain;
            String firstId = null;
            try {
                Map<String, Object> params = new LinkedHashMap<>();
                params.put("emailAddress", testAddr);
                params.put("displayName", "SDK error catalog — safe to delete");
                Map<String, Object> created = mi.sendingIdentifiers.create(params);
                firstId = (String) created.get("id");

                Map<String, Object> dup = new LinkedHashMap<>();
                dup.put("emailAddress", testAddr);
                dup.put("displayName", "duplicate");
                trigger(6, "register identifier that already exists", ConflictException.class,
                        () -> mi.sendingIdentifiers.create(dup));
            } catch (Throwable err) {
                System.out.println("\n━━━ 6. ConflictException: register identifier twice ━━━");
                System.out.println("  ✗ Setup failed: " + err.getMessage());
            } finally {
                if (firstId != null) {
                    try { mi.sendingIdentifiers.delete(firstId); } catch (Throwable ignored) {}
                }
            }
        } else {
            System.out.println("\n━━━ 6. ConflictException ━━━\n  (skipped)");
        }

        // 7. UnverifiedDomainException
        if (canTrigger) {
            String subDomain = "sdk-error-" + TS + "." + TEST_DOMAIN;
            String testFrom = "sender@" + subDomain;
            String identifierId = null;
            try {
                Map<String, Object> bulk = mi.domains.bulkCreate(
                        Collections.singletonList(Collections.singletonMap("domainName", subDomain)));
                String taskId = (String) bulk.get("taskId");
                mi.tasks.waitFor(taskId, 3_000, 30_000, null);
                Map<String, Object> identifier = mi.sendingIdentifiers.create(
                        Collections.singletonMap("emailAddress", testFrom));
                identifierId = (String) identifier.get("id");
                Map<String, Object> params = new LinkedHashMap<>();
                params.put("from", testFrom);
                params.put("to", TEST_TO);
                params.put("subject", "unverified");
                params.put("text", "should fail");
                trigger(7, "send from unverified-domain identifier", UnverifiedDomainException.class,
                        () -> mi.emails.send(params));
            } catch (Throwable err) {
                System.out.println("\n━━━ 7. UnverifiedDomainException ━━━");
                System.out.println("  ✗ Setup failed: " + err.getMessage());
            } finally {
                if (identifierId != null) {
                    try { mi.sendingIdentifiers.delete(identifierId); } catch (Throwable ignored) {}
                }
                try { mi.domains.bulkDelete(Collections.singletonList(subDomain)); } catch (Throwable ignored) {}
            }
        } else {
            System.out.println("\n━━━ 7. UnverifiedDomainException ━━━\n  (skipped)");
        }

        // 8. NetworkException
        MissionInbox unreachable = MissionInbox.builder()
                .apiKey(API_KEY)
                .baseUrl("https://127.0.0.1:1")
                .maxRetries(0)
                .timeout(Duration.ofSeconds(2))
                .build();
        trigger(8, "unreachable host", NetworkException.class,
                () -> unreachable.health.check());

        // Summary
        System.out.println("\n━━━ Summary ━━━");
        long passes = RESULTS.stream().filter(r -> r.pass).count();
        System.out.println("  " + passes + "/" + RESULTS.size() + " exception mappings correct");
        for (Result r : RESULTS) {
            System.out.println("  " + (r.pass ? "✓" : "✗") + " #" + r.id
                    + " [" + r.status + "] " + r.expected + ": " + r.name);
        }
        System.out.println();
        System.out.println("Not tested here (need special account state or would burden staging):");
        for (String s : Arrays.asList(
                "SubscriptionInactiveException — inactive account",
                "SendLimitExceededException    — Free plan hitting 20/day cap",
                "DomainBlacklistedException    — blacklisted domain",
                "RateLimitException            — sustained request volume",
                "ServerException               — API 5xx",
                "SendException                 — SES rejection",
                "PermissionException (base)    — non-specific 403")) {
            System.out.println("  " + s);
        }
    }

    private static void trigger(int id, String name, Class<? extends Throwable> expectedClass,
                                Supplier<Object> fn) {
        String expected = expectedClass.getSimpleName();
        System.out.println("\n━━━ " + id + ". " + expected + ": " + name + " ━━━");
        try {
            Object r = fn.get();
            System.out.println("  ✗ Expected " + expected + ", got success: " + truncate(String.valueOf(r), 120));
            RESULTS.add(new Result(id, name, expected, "no-throw", 0, false));
        } catch (Throwable err) {
            String actual = err.getClass().getSimpleName();
            int status = err instanceof MissionInboxException ? ((MissionInboxException) err).getStatus() : 0;
            Object body = err instanceof MissionInboxException ? ((MissionInboxException) err).getBody() : null;
            boolean pass = expectedClass.isInstance(err);
            String mark = pass ? "✓" : "✗";
            System.out.println("  " + mark + " Actual class:  " + actual + (pass ? "" : "  (expected " + expected + ")"));
            System.out.println("     HTTP status:  " + status);
            System.out.println("     Response body: " + body);
            System.out.println("     Message:       " + truncate(err.getMessage() == null ? "" : err.getMessage(), 160));
            RESULTS.add(new Result(id, name, expected, actual, status, pass));
        }
    }

    private static String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static final class Result {
        final int id;
        final String name;
        final String expected;
        final String actual;
        final int status;
        final boolean pass;

        Result(int id, String name, String expected, String actual, int status, boolean pass) {
            this.id = id;
            this.name = name;
            this.expected = expected;
            this.actual = actual;
            this.status = status;
            this.pass = pass;
        }
    }
}
