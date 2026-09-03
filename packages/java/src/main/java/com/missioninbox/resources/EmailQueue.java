package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The {@code emailQueue} resource. Access via {@code mi.emailQueue}.
 */
public final class EmailQueue {

    private final HttpClient http;

    public EmailQueue(HttpClient http) {
        this.http = http;
    }

    /**
     * List queued messages.
     *
     * <p>Recognised keys: {@code status}, {@code sendingAccountId}, {@code page}, {@code limit}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> list(Map<String, Object> params) {
        return (Map<String, Object>) http.request("GET", "/api/email/queue", params, null);
    }

    /** Retry a failed queued message. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> retry(String id) {
        return (Map<String, Object>) http.request(
                "POST", "/api/email/queue/" + encode(id) + "/retry", null, null);
    }

    /** Cancel a pending queued message. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> cancel(String id) {
        return (Map<String, Object>) http.request(
                "POST", "/api/email/queue/" + encode(id) + "/cancel", null, null);
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
