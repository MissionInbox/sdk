package com.missioninbox;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

final class TasksTest {

    private MissionInbox newClient(MockServer server) {
        return MissionInbox.builder()
                .apiKey("test-key")
                .baseUrl(server.baseUrl())
                .maxRetries(0)
                .timeout(Duration.ofSeconds(5))
                .build();
    }

    private Map<String, Object> task(String status, int progress) {
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("id", "t-1");
        t.put("type", "BULK_CREATE_DOMAINS");
        t.put("status", status);
        t.put("progress", progress);
        t.put("retryCount", 0);
        t.put("maxRetries", 3);
        return t;
    }

    @Test
    void list_query_params() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("tasks", List.of(), "total", 0, "page", 1, "limit", 20, "totalPages", 0));
            MissionInbox mi = newClient(server);
            mi.tasks.list(Map.of("status", "COMPLETED", "page", 2, "limit", 50));
            String q = server.lastRequest().rawQuery;
            assertTrue(q.contains("status=COMPLETED"));
            assertTrue(q.contains("page=2"));
            assertTrue(q.contains("limit=50"));
        }
    }

    @Test
    void cancel_delete() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, task("CANCELLED", 0));
            MissionInbox mi = newClient(server);
            mi.tasks.cancel("t-1");
            assertEquals("DELETE", server.lastRequest().method);
            assertEquals("/api/tasks/t-1/cancel", server.lastRequest().path);
        }
    }

    @Test
    void get_outputs_since() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, Map.of("outputs", List.of()));
            MissionInbox mi = newClient(server);
            mi.tasks.getOutputs("t-1", "out-9");
            assertTrue(server.lastRequest().rawQuery.contains("since=out-9"));
        }
    }

    @Test
    void wait_for_resolves_on_terminal() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, task("PROCESSING", 10));
            server.enqueueJson(200, task("PROCESSING", 50));
            server.enqueueJson(200, task("COMPLETED", 100));

            MissionInbox mi = newClient(server);
            List<Integer> progress = new ArrayList<>();
            Map<String, Object> done = mi.tasks.waitFor("t-1", 1, 5_000, t -> progress.add((Integer) t.get("progress")));
            assertEquals("COMPLETED", done.get("status"));
            assertEquals(List.of(10, 50, 100), progress);
        }
    }

    @Test
    void wait_for_timeout() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, task("PROCESSING", 10));
            server.reuseLastResponse();

            MissionInbox mi = newClient(server);
            // pollInterval > timeout guarantees the deadline fires on iteration 1
            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> mi.tasks.waitFor("t-1", 100, 10, null));
            assertTrue(ex.getMessage().contains("Timed out"));
        }
    }

    @Test
    void wait_for_immediate_on_terminal() throws Exception {
        try (MockServer server = new MockServer()) {
            server.enqueueJson(200, task("FAILED", 0));
            MissionInbox mi = newClient(server);
            Map<String, Object> result = mi.tasks.waitFor("t-1", 1, 5_000, null);
            assertEquals("FAILED", result.get("status"));
        }
    }
}
