package com.missioninbox;

import com.missioninbox.http.HttpClient;
import com.missioninbox.resources.Analytics;
import com.missioninbox.resources.Domains;
import com.missioninbox.resources.EmailQueue;
import com.missioninbox.resources.Emails;
import com.missioninbox.resources.Health;
import com.missioninbox.resources.Projects;
import com.missioninbox.resources.SendingIdentifiers;
import com.missioninbox.resources.Tasks;

import java.time.Duration;

/**
 * The MissionInbox API client.
 *
 * <p>Construct once and reuse across your process — the client is stateless
 * beyond its configuration.
 *
 * <pre>{@code
 * MissionInbox mi = MissionInbox.builder()
 *     .apiKey(System.getenv("MI_API_KEY"))
 *     .baseUrl(System.getenv("MI_API_URL"))
 *     .build();
 *
 * Map<String, Object> result = mi.emails.send(Map.of(
 *     "from", "notifications@acme.com",
 *     "to", "user@example.com",
 *     "subject", "Welcome",
 *     "html", "<p>Hi</p>"
 * ));
 * }</pre>
 */
public final class MissionInbox {

    /** Send and inspect transactional email. */
    public final Emails emails;
    /** Queued outbound emails: list, retry, cancel. */
    public final EmailQueue emailQueue;
    /** Domain management + verification + nested {@code redirects} sub-resource. */
    public final Domains domains;
    /** Registered {@code From:} addresses. */
    public final SendingIdentifiers sendingIdentifiers;
    /** Grouping of domains into projects. */
    public final Projects projects;
    /** Send / activity analytics. */
    public final Analytics analytics;
    /** Background bulk-operation tasks. */
    public final Tasks tasks;
    /** Health / liveness ping. */
    public final Health health;

    private MissionInbox(Builder b) {
        if (b.apiKey == null || b.apiKey.isEmpty()) {
            throw new IllegalArgumentException("MissionInbox: `apiKey` is required.");
        }
        if (b.baseUrl == null || b.baseUrl.isEmpty()) {
            throw new IllegalArgumentException(
                    "MissionInbox: `baseUrl` is required. Use the URL provided for your environment.");
        }

        HttpClient http = new HttpClient(b.apiKey, b.baseUrl, b.timeout, b.maxRetries);

        this.emails = new Emails(http);
        this.emailQueue = new EmailQueue(http);
        this.domains = new Domains(http);
        this.sendingIdentifiers = new SendingIdentifiers(http);
        this.projects = new Projects(http);
        this.analytics = new Analytics(http);
        this.tasks = new Tasks(http);
        this.health = new Health(http);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String apiKey;
        private String baseUrl;
        private Duration timeout = Duration.ofSeconds(30);
        private int maxRetries = 2;

        /** Your MissionInbox product API key. */
        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        /** Base URL of your MissionInbox environment (no default — provided by MissionInbox). */
        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        /** Per-request timeout. Default 30 seconds. */
        public Builder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }

        /** Retries on 429 / 5xx (exponential backoff, honours Retry-After). Default 2. */
        public Builder maxRetries(int maxRetries) {
            this.maxRetries = maxRetries;
            return this;
        }

        public MissionInbox build() {
            return new MissionInbox(this);
        }
    }
}
