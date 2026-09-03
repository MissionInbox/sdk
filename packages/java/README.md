# com.missioninbox:sdk

Official [MissionInbox](https://missioninbox.com) SDK for Java.

## Install

Maven:

```xml
<dependency>
  <groupId>com.missioninbox</groupId>
  <artifactId>sdk</artifactId>
  <version>0.1.0</version>
</dependency>
```

Gradle (Kotlin DSL):

```kotlin
implementation("com.missioninbox:sdk:0.1.0")
```

Requires Java 11 or newer.

## Get an API key

Generate a product API key from your MissionInbox dashboard. The SDK sends it via the `X-Server-API-Key` header. Keep separate keys for staging and production.

Environment URLs:

- **Staging:** `https://api-v4-staging.missioninbox.com`
- **Production:** contact your MissionInbox account manager for the URL of your assigned cluster.

## Send a transactional email

```java
import com.missioninbox.MissionInbox;
import java.util.Map;

MissionInbox mi = MissionInbox.builder()
    .apiKey(System.getenv("MI_API_KEY"))
    .baseUrl(System.getenv("MI_API_URL")) // provided by MissionInbox for your environment
    .build();

Map<String, Object> result = mi.emails.send(Map.of(
    "from", "notifications@yourdomain.com",
    "to", "user@example.com",
    "subject", "Welcome",
    "html", "<p>Hi 👋</p>"
));

System.out.println("sent " + result.get("id"));
```

The `from` address must be a **registered sending identifier**. Register one first:

```java
mi.sendingIdentifiers.create(Map.of(
    "emailAddress", "notifications@yourdomain.com",
    "displayName", "Acme Notifications"
));
```

## Resources

| Resource | Purpose |
|---|---|
| `mi.emails` | Send, look up status, fetch details, search |
| `mi.emailQueue` | Inspect / retry / cancel queued messages |
| `mi.domains` | Register domains, verify DNS, push records, delete |
| `mi.domains.redirects` | Set up URL redirects on a domain |
| `mi.sendingIdentifiers` | Manage approved `From:` addresses |
| `mi.projects` | Group domains into projects |
| `mi.analytics` | Send activity overview and time-series graphs |
| `mi.tasks` | Poll background tasks (bulk operations) |
| `mi.health` | Unauthenticated liveness ping |

## Configuration

Configure via the builder:

```java
MissionInbox mi = MissionInbox.builder()
    .apiKey("...")
    .baseUrl("https://api-v4-staging.missioninbox.com")  // your environment URL
    .timeout(Duration.ofSeconds(60))                     // default 30
    .maxRetries(3)                                       // default 2
    .build();
```

Retries fire on 429 and 5xx with exponential backoff and honour `Retry-After`.

## Errors

Every failure throws a subclass of `com.missioninbox.exceptions.MissionInboxException`. Catch the specific one you care about:

```java
import com.missioninbox.exceptions.*;

try {
    mi.emails.send(Map.of(/* ... */));
} catch (AuthenticationException e) {
    // 401 — API key missing or invalid
} catch (UnregisteredSenderException e) {
    // 403 — `from` hasn't been registered
} catch (UnverifiedDomainException e) {
    // 403 — domain DNS not verified
} catch (SendLimitExceededException e) {
    // 403 — plan cap reached
}
```

Full hierarchy (all in `com.missioninbox.exceptions`):

- `MissionInboxException` — base (unchecked)
  - `AuthenticationException` (401)
  - `PermissionException` (403)
    - `UnregisteredSenderException`, `UnverifiedDomainException`, `SubscriptionInactiveException`, `SendLimitExceededException`, `DomainBlacklistedException`
  - `ValidationException` (400)
  - `NotFoundException` (404)
  - `ConflictException` (409)
  - `SendException` (422)
  - `RateLimitException` (429)
  - `ServerException` (5xx)
  - `NetworkException` (transport failure)

## Bulk operations and tasks

Bulk endpoints dispatch a background task and return `{"taskId": ..., "message": ...}` immediately. Poll to completion with `tasks.waitFor()`:

```java
Map<String, Object> response = mi.domains.bulkCreate(List.of(
    Map.of("domainName", "acme.com"),
    Map.of("domainName", "shop.acme.com")
));

Map<String, Object> done = mi.tasks.waitFor(
    (String) response.get("taskId"),
    3_000,          // pollIntervalMs
    5 * 60 * 1000,  // timeoutMs
    task -> System.out.println(task.get("progress") + "%")
);
```

## Working with domains

```java
Map<String, Object> domain = mi.domains.create(Map.of("domainName", "acme.com"));

Map<String, Object> verification = mi.domains.verify("acme.com");
if (Boolean.TRUE.equals(verification.get("fullyVerified"))) {
    System.out.println("ready to send");
}

// If a DNS manager is connected:
mi.domains.pushDns("acme.com");
```

## Analytics

```java
Map<String, Object> overview = mi.analytics.getOverview();

Map<String, Object> graph = mi.analytics.getActivityGraph(
    "daily",
    "2026-08-01T00:00:00Z",
    "2026-08-31T23:59:59Z",
    List.of("outgoing", "bounces")
);
```

## License

MIT
