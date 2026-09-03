package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The {@code emails} resource. Access via {@code mi.emails}.
 *
 * <p>Inputs use camelCase keys where the SDK diverges from the wire — the
 * mapping to snake_case fields (like {@code html_body}, {@code reply_to},
 * {@code message_id}) happens internally.
 */
public final class Emails {

    private final HttpClient http;

    public Emails(HttpClient http) {
        this.http = http;
    }

    /**
     * Send a transactional email.
     *
     * <p>Recognised parameter keys (all optional except {@code from}):
     * <ul>
     *   <li>{@code from} (String, required) — must be a registered sending identifier</li>
     *   <li>{@code to} / {@code cc} / {@code bcc} (String or List&lt;String&gt;)</li>
     *   <li>{@code subject} (String)</li>
     *   <li>{@code html} (String) — HTML body</li>
     *   <li>{@code text} (String) — plain-text body</li>
     *   <li>{@code replyTo} (String) — defaults to {@code from}</li>
     *   <li>{@code sender} (String) — Sender header</li>
     *   <li>{@code tag} (String) — categorisation label</li>
     *   <li>{@code headers} (Map&lt;String, String&gt;) — extra MIME headers</li>
     *   <li>{@code messageId} (String) — custom Message-ID</li>
     *   <li>{@code attachments} (List&lt;Map&gt;) — each with {@code filename},
     *       {@code contentType}, {@code content} (base64)</li>
     * </ul>
     *
     * @return Map with keys {@code id}, {@code message}, {@code status}, {@code time}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> send(Map<String, Object> params) {
        Map<String, Object> payload = new LinkedHashMap<>();
        Object from = params.get("from");
        payload.put("from", from);
        payload.put("reply_to", params.getOrDefault("replyTo", from));

        putList(payload, "to", params.get("to"));
        putList(payload, "cc", params.get("cc"));
        putList(payload, "bcc", params.get("bcc"));

        putIfPresent(payload, "subject", params.get("subject"));
        putIfPresent(payload, "html_body", params.get("html"));
        putIfPresent(payload, "plain_body", params.get("text"));
        putIfPresent(payload, "sender", params.get("sender"));
        putIfPresent(payload, "tag", params.get("tag"));
        putIfPresent(payload, "headers", params.get("headers"));
        putIfPresent(payload, "message_id", params.get("messageId"));

        Object attachments = params.get("attachments");
        if (attachments instanceof List<?>) {
            List<Map<String, Object>> mapped = new ArrayList<>();
            for (Object entry : (List<?>) attachments) {
                if (!(entry instanceof Map<?, ?>)) continue;
                Map<String, Object> a = (Map<String, Object>) entry;
                Map<String, Object> wire = new LinkedHashMap<>();
                wire.put("name", a.get("filename"));
                wire.put("content_type", a.get("contentType"));
                wire.put("data", a.get("content"));
                mapped.add(wire);
            }
            if (!mapped.isEmpty()) {
                payload.put("attachments", mapped);
            }
        }

        return (Map<String, Object>) http.request("POST", "/api/email/send", null, payload);
    }

    /**
     * Look up the delivery status of a single message by its RFC 822
     * {@code Message-ID} header.
     *
     * <p>Important: {@code messageId} is <b>not</b> the id returned by
     * {@link #send} (that is the API's internal numeric primary key). To
     * obtain the {@code Message-ID} header value after sending, call
     * {@link #getDetails} with {@code include: ["properties"]} and read
     * {@code result.message.properties.message_id}. It's also present on
     * each hit returned by {@link #search}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getStatus(String messageId) {
        return (Map<String, Object>) http.request(
                "POST", "/api/email/status", null, Collections.singletonMap("messageId", messageId));
    }

    /**
     * Look up delivery status for many messages. Entries in {@code statuses}
     * align by index with {@code messageIds}; {@code null} entries mean the id
     * was not found.
     *
     * <p>Same caveat as {@link #getStatus}: each entry must be an RFC 822
     * {@code Message-ID} header value, not the numeric id returned by
     * {@link #send}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getBulkStatus(List<String> messageIds) {
        return (Map<String, Object>) http.request(
                "POST", "/api/email/bulk_status", null, Collections.singletonMap("messageIds", messageIds));
    }

    /**
     * Fetch full details of a message.
     *
     * @param include Optional list of section names: {@code properties}, {@code activity},
     *                {@code headers}, {@code spam_checks}, {@code content}, {@code attachments}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDetails(String messageId, List<String> include) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", messageId);
        if (include != null && !include.isEmpty()) {
            body.put("include", String.join(",", include));
        }
        return (Map<String, Object>) http.request("POST", "/api/email/details", null, body);
    }

    public Map<String, Object> getDetails(String messageId) {
        return getDetails(messageId, null);
    }

    /** Retrieve the raw RFC-822 source of a message. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getRaw(String messageId) {
        return (Map<String, Object>) http.request(
                "POST", "/api/email/raw", null, Collections.singletonMap("id", messageId));
    }

    /**
     * Search sent/received messages.
     *
     * <p>Recognised keys: {@code from}, {@code sendingIdentifierId}, {@code to},
     * {@code messageId}, {@code status}, {@code direction}, {@code keyword},
     * {@code page}, {@code limit}, {@code order}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> search(Map<String, Object> params) {
        Map<String, Object> body = new LinkedHashMap<>();
        putIfPresent(body, "from", params.get("from"));
        putIfPresent(body, "sending_identifier_id", params.get("sendingIdentifierId"));
        putIfPresent(body, "to", params.get("to"));
        putIfPresent(body, "message_id", params.get("messageId"));
        putIfPresent(body, "status", params.get("status"));
        putIfPresent(body, "direction", params.get("direction"));
        putIfPresent(body, "keyword", params.get("keyword"));
        putIfPresent(body, "page", params.get("page"));
        putIfPresent(body, "limit", params.get("limit"));
        putIfPresent(body, "order", params.get("order"));
        return (Map<String, Object>) http.request("POST", "/api/email/search", null, body);
    }

    /** Report the account's current send-limit state. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getSendLimit() {
        return (Map<String, Object>) http.request("GET", "/api/email/send-limit-status", null, null);
    }

    private static void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value != null) target.put(key, value);
    }

    @SuppressWarnings("unchecked")
    private static void putList(Map<String, Object> target, String key, Object value) {
        if (value == null) return;
        if (value instanceof List<?>) {
            target.put(key, value);
        } else {
            target.put(key, Collections.singletonList(value));
        }
    }
}
