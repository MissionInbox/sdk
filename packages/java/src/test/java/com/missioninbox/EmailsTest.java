package com.missioninbox;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioninbox.http.HttpClient;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

final class EmailsTest {

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
    void constructor_missing_api_key_throws() {
        assertThrows(IllegalArgumentException.class, () ->
                MissionInbox.builder().apiKey("").baseUrl("https://x").build());
    }

    @Test
    void constructor_missing_base_url_throws() {
        assertThrows(IllegalArgumentException.class, () ->
                MissionInbox.builder().apiKey("k").baseUrl("").build());
    }

    @Test
    void send_maps_camel_to_snake_and_defaults_reply_to() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("id", "42", "message", "Email sent", "status", "sent", "time", 123));

            MissionInbox mi = newClient(server);
            Map<String, Object> result = mi.emails.send(Map.of(
                    "from", "notifications@acme.com",
                    "to", "user@example.com",
                    "subject", "Hi",
                    "html", "<p>Hi</p>"
            ));

            assertEquals("42", result.get("id"));

            MockServer.CapturedRequest req = server.lastRequest();
            assertEquals("POST", req.method);
            assertEquals("/api/email/send", req.path);
            assertEquals("test-key", req.headers.get("x-server-api-key"), "X-Server-API-Key header");
            assertTrue(req.headers.get("user-agent").startsWith("missioninbox-java/"), "User-Agent");

            Map<String, Object> body = MAPPER.readValue(req.body, new TypeReference<Map<String, Object>>() {});
            assertEquals("notifications@acme.com", body.get("from"));
            assertEquals("notifications@acme.com", body.get("reply_to"));
            assertEquals(List.of("user@example.com"), body.get("to"));
            assertEquals("Hi", body.get("subject"));
            assertEquals("<p>Hi</p>", body.get("html_body"));
        }
    }

    @Test
    void send_attachments_map_to_snake_case() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("id", "1", "message", "ok", "status", "sent", "time", 1));

            MissionInbox mi = newClient(server);
            Map<String, Object> attachment = new LinkedHashMap<>();
            attachment.put("filename", "x.pdf");
            attachment.put("contentType", "application/pdf");
            attachment.put("content", "aGk=");

            mi.emails.send(Map.of(
                    "from", "a@b.com",
                    "to", "c@d.com",
                    "subject", "s",
                    "text", "t",
                    "attachments", List.of(attachment)
            ));

            Map<String, Object> body = MAPPER.readValue(server.lastRequest().body, new TypeReference<Map<String, Object>>() {});
            List<?> attachments = (List<?>) body.get("attachments");
            assertEquals(1, attachments.size());
            Map<?, ?> a = (Map<?, ?>) attachments.get(0);
            assertEquals("x.pdf", a.get("name"));
            assertEquals("application/pdf", a.get("content_type"));
            assertEquals("aGk=", a.get("data"));
        }
    }

    @Test
    void get_status() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("id", "1"));
            MissionInbox mi = newClient(server);
            mi.emails.getStatus("msg_1");
            assertEquals("/api/email/status", server.lastRequest().path);
            Map<String, Object> body = MAPPER.readValue(server.lastRequest().body, new TypeReference<Map<String, Object>>() {});
            assertEquals(Map.of("messageId", "msg_1"), body);
        }
    }

    @Test
    void get_bulk_status() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("statuses", List.of()));
            MissionInbox mi = newClient(server);
            mi.emails.getBulkStatus(Arrays.asList("a", "b"));
            Map<String, Object> body = MAPPER.readValue(server.lastRequest().body, new TypeReference<Map<String, Object>>() {});
            assertEquals(List.of("a", "b"), body.get("messageIds"));
        }
    }

    @Test
    void get_details_include_joined() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("message", Map.of("id", 1)));
            MissionInbox mi = newClient(server);
            mi.emails.getDetails("msg_1", Arrays.asList("content", "headers"));
            Map<String, Object> body = MAPPER.readValue(server.lastRequest().body, new TypeReference<Map<String, Object>>() {});
            assertEquals("content,headers", body.get("include"));
        }
    }

    @Test
    void get_details_omits_include() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("message", Map.of("id", 1)));
            MissionInbox mi = newClient(server);
            mi.emails.getDetails("msg_1");
            Map<String, Object> body = MAPPER.readValue(server.lastRequest().body, new TypeReference<Map<String, Object>>() {});
            assertEquals(Map.of("id", "msg_1"), body);
        }
    }

    @Test
    void search_maps_sending_identifier_id() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("data", List.of(), "total", 0, "page", 1, "limit", 30, "totalPages", 0));
            MissionInbox mi = newClient(server);
            mi.emails.search(Map.of(
                    "sendingIdentifierId", "uuid-1",
                    "status", "Sent",
                    "limit", 10
            ));
            Map<String, Object> body = MAPPER.readValue(server.lastRequest().body, new TypeReference<Map<String, Object>>() {});
            assertEquals("uuid-1", body.get("sending_identifier_id"));
            assertEquals("Sent", body.get("status"));
            assertEquals(10, body.get("limit"));
        }
    }

    @Test
    void get_send_limit_is_get() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("limited", false));
            MissionInbox mi = newClient(server);
            Map<String, Object> result = mi.emails.getSendLimit();
            assertEquals(false, result.get("limited"));
            assertEquals("GET", server.lastRequest().method);
        }
    }
}
