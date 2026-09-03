package com.missioninbox;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

final class ResourcesTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private MissionInbox newClient(MockServer server) {
        return MissionInbox.builder()
                .apiKey("test-key")
                .baseUrl(server.baseUrl())
                .maxRetries(0)
                .timeout(Duration.ofSeconds(5))
                .build();
    }

    @Test
    void sending_identifiers_list_get() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, List.of());
            MissionInbox mi = newClient(server);
            mi.sendingIdentifiers.list();
            assertEquals("GET", server.lastRequest().method);
            assertEquals("/api/sending-identifiers", server.lastRequest().path);
        }
    }

    @Test
    void sending_identifiers_update_patches() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("id", "x"));
            MissionInbox mi = newClient(server);
            mi.sendingIdentifiers.update("uuid-1", Map.of("displayName", "Acme"));
            assertEquals("PATCH", server.lastRequest().method);
            Map<String, Object> body = MAPPER.readValue(server.lastRequest().body, new TypeReference<Map<String, Object>>() {});
            assertEquals("Acme", body.get("displayName"));
        }
    }

    @Test
    void domains_list_query_string() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("data", List.of()));
            MissionInbox mi = newClient(server);
            mi.domains.list(Map.of("verified", true, "limit", 50, "page", 2));
            String q = server.lastRequest().rawQuery;
            assertNotNull(q);
            assertTrue(q.contains("verified=true"));
            assertTrue(q.contains("limit=50"));
            assertTrue(q.contains("page=2"));
        }
    }

    @Test
    void domains_get_by_id_path() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("id", "x"));
            MissionInbox mi = newClient(server);
            mi.domains.get("uuid-1");
            assertEquals("/api/domains/by-id/uuid-1", server.lastRequest().path);
        }
    }

    @Test
    void domains_verify() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("fullyVerified", true, "dnsChecks", Map.of("dkim", Map.of("status", "OK")), "message", ""));
            MissionInbox mi = newClient(server);
            mi.domains.verify("acme.com");
            assertEquals("/api/domains/verify", server.lastRequest().path);
            Map<String, Object> body = MAPPER.readValue(server.lastRequest().body, new TypeReference<Map<String, Object>>() {});
            assertEquals("acme.com", body.get("domainName"));
        }
    }

    @Test
    void domains_bulk_create_returns_task_id() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("taskId", "t-1", "message", "started"));
            MissionInbox mi = newClient(server);
            Map<String, Object> result = mi.domains.bulkCreate(List.of(Map.of("domainName", "a.com")));
            assertEquals("t-1", result.get("taskId"));
        }
    }

    @Test
    void domains_export_csv_returns_text() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueue(200, "text/csv", "name,verified\nacme.com,true");
            MissionInbox mi = newClient(server);
            String csv = mi.domains.exportCsv();
            assertEquals("name,verified\nacme.com,true", csv);
        }
    }

    @Test
    void domain_redirect_setup_puts() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("success", true, "action", "created"));
            MissionInbox mi = newClient(server);
            mi.domains.redirects.setup("acme.com", Map.of("redirectUrl", "https://www.acme.com", "forceHttps", true));
            assertEquals("PUT", server.lastRequest().method);
            assertEquals("/api/domains/acme.com/redirect", server.lastRequest().path);
        }
    }

    @Test
    void projects_assign_domains_patch() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("project", Map.of(), "total", 1, "successful", 1, "failed", 0, "reassigned", 0, "results", List.of()));
            MissionInbox mi = newClient(server);
            mi.projects.assignDomains("p-1", List.of("a.com"));
            assertEquals("PATCH", server.lastRequest().method);
            assertEquals("/api/projects/p-1/domains", server.lastRequest().path);
        }
    }

    @Test
    void analytics_activity_graph_query() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of());
            MissionInbox mi = newClient(server);
            mi.analytics.getActivityGraph(
                    "daily",
                    "2026-01-01T00:00:00Z",
                    "2026-01-31T23:59:59Z",
                    List.of("outgoing", "bounces")
            );
            String q = server.lastRequest().rawQuery;
            assertTrue(q.contains("granularity=daily"));
            assertTrue(q.contains("counters=outgoing"));
            assertTrue(q.contains("counters=bounces"));
        }
    }

    @Test
    void email_queue_retry_post() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of());
            MissionInbox mi = newClient(server);
            mi.emailQueue.retry("q-1");
            assertEquals("POST", server.lastRequest().method);
            assertEquals("/api/email/queue/q-1/retry", server.lastRequest().path);
        }
    }

    @Test
    void health_check_returns_text() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueue(200, "text/plain", "Healthy");
            MissionInbox mi = newClient(server);
            assertEquals("Healthy", mi.health.check());
        }
    }
}
