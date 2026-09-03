package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

/**
 * The {@code tasks} resource. Access via {@code mi.tasks}.
 *
 * <p>Bulk operations dispatch background tasks and return a map with a
 * {@code taskId}. Poll to completion via {@link #waitFor(String)} or call
 * {@link #get(String)} yourself.
 */
public final class Tasks {

    /** Terminal statuses reached by {@link #waitFor}. */
    public static final List<String> TERMINAL_STATUSES =
            Collections.unmodifiableList(Arrays.asList("COMPLETED", "FAILED", "CANCELLED"));

    private static final Set<String> TERMINAL_SET = new HashSet<>(TERMINAL_STATUSES);

    private final HttpClient http;

    public Tasks(HttpClient http) {
        this.http = http;
    }

    /**
     * List tasks. Recognised query keys: {@code type}, {@code status}, {@code page}, {@code limit}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> list(Map<String, Object> params) {
        return (Map<String, Object>) http.request("GET", "/api/tasks", params, null);
    }

    public Map<String, Object> list() {
        return list(null);
    }

    /** Retrieve a task by id. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String id) {
        return (Map<String, Object>) http.request("GET", "/api/tasks/" + encode(id), null, null);
    }

    /** Cancel a pending or in-progress task. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> cancel(String id) {
        return (Map<String, Object>) http.request(
                "DELETE", "/api/tasks/" + encode(id) + "/cancel", null, null);
    }

    /** Retrieve a task's execution log. {@code since} is a task-output id from a previous poll. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getOutputs(String id, String since) {
        Map<String, Object> query = since == null
                ? null
                : Collections.singletonMap("since", since);
        return (Map<String, Object>) http.request(
                "GET", "/api/tasks/" + encode(id) + "/outputs", query, null);
    }

    public Map<String, Object> getOutputs(String id) {
        return getOutputs(id, null);
    }

    /** Account-wide task counts by status. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getStatsSummary() {
        return (Map<String, Object>) http.request("GET", "/api/tasks/stats/summary", null, null);
    }

    /**
     * Poll a task until it reaches a terminal state.
     *
     * @param id Task id.
     * @param pollIntervalMs Milliseconds between polls.
     * @param timeoutMs Total deadline in milliseconds.
     * @param onProgress Optional consumer called after each poll.
     * @throws RuntimeException with a "Timed out" message if the deadline passes.
     */
    public Map<String, Object> waitFor(
            String id,
            long pollIntervalMs,
            long timeoutMs,
            Consumer<Map<String, Object>> onProgress) {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (true) {
            Map<String, Object> task = get(id);
            if (onProgress != null) onProgress.accept(task);
            Object status = task.get("status");
            if (status instanceof String && TERMINAL_SET.contains(status)) {
                return task;
            }
            if (System.currentTimeMillis() + pollIntervalMs > deadline) {
                throw new RuntimeException(String.format(
                        "Timed out after %dms waiting for task %s (last status: %s)",
                        timeoutMs, id, status));
            }
            try {
                Thread.sleep(pollIntervalMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Interrupted while waiting for task " + id, e);
            }
        }
    }

    public Map<String, Object> waitFor(String id) {
        return waitFor(id, 2_000, 300_000, null);
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
