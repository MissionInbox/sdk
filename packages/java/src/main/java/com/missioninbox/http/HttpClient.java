package com.missioninbox.http;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.missioninbox.exceptions.AuthenticationException;
import com.missioninbox.exceptions.ConflictException;
import com.missioninbox.exceptions.DomainBlacklistedException;
import com.missioninbox.exceptions.MissionInboxException;
import com.missioninbox.exceptions.NetworkException;
import com.missioninbox.exceptions.NotFoundException;
import com.missioninbox.exceptions.PermissionException;
import com.missioninbox.exceptions.RateLimitException;
import com.missioninbox.exceptions.SendException;
import com.missioninbox.exceptions.SendLimitExceededException;
import com.missioninbox.exceptions.ServerException;
import com.missioninbox.exceptions.SubscriptionInactiveException;
import com.missioninbox.exceptions.UnregisteredSenderException;
import com.missioninbox.exceptions.UnverifiedDomainException;
import com.missioninbox.exceptions.ValidationException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Internal transport wrapper. Users should not construct or invoke this
 * directly — access resources via {@link com.missioninbox.MissionInbox}.
 */
public final class HttpClient {

    public static final String SDK_VERSION = "0.1.0";

    private static final Set<Integer> RETRYABLE_STATUSES =
            new HashSet<>(Arrays.asList(429, 500, 502, 503, 504));

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<Map<String, Object>>() {};

    private final java.net.http.HttpClient http;
    private final String apiKey;
    private final String baseUrl;
    private final Duration timeout;
    private final int maxRetries;

    public HttpClient(String apiKey, String baseUrl, Duration timeout, int maxRetries) {
        this.apiKey = apiKey;
        this.baseUrl = stripTrailingSlashes(baseUrl);
        this.timeout = timeout;
        this.maxRetries = maxRetries;
        this.http = java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * @param method HTTP method
     * @param path Request path starting with `/`
     * @param query Optional query parameters (value may be scalar or {@code List})
     * @param body Optional request body — will be JSON-encoded
     * @return Parsed response: a {@code Map<String, Object>} for JSON, a {@code List<?>} for
     *         JSON arrays, a {@code String} for text bodies, or {@code null} for 204s / empty bodies.
     */
    public Object request(String method, String path, Map<String, Object> query, Map<String, Object> body) {
        String url = baseUrl + path + buildQuery(query);
        HttpRequest.Builder rb = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(timeout)
                .header("X-Server-API-Key", apiKey)
                .header("User-Agent", "missioninbox-java/" + SDK_VERSION)
                .header("Accept", "application/json");

        HttpRequest.BodyPublisher publisher;
        if (body != null) {
            try {
                publisher = HttpRequest.BodyPublishers.ofByteArray(MAPPER.writeValueAsBytes(body));
                rb.header("Content-Type", "application/json");
            } catch (IOException e) {
                throw new RuntimeException("Failed to serialize request body", e);
            }
        } else if (methodRequiresBody(method)) {
            publisher = HttpRequest.BodyPublishers.noBody();
        } else {
            publisher = HttpRequest.BodyPublishers.noBody();
        }

        rb.method(method, publisher);
        HttpRequest request = rb.build();

        int attempt = 0;
        Throwable lastError = null;

        while (attempt <= maxRetries) {
            HttpResponse<String> response;
            try {
                response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            } catch (IOException | InterruptedException e) {
                lastError = e;
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
                if (attempt < maxRetries) {
                    sleep(backoffDelay(attempt, null));
                    attempt++;
                    continue;
                }
                throw new NetworkException(e.getMessage(), e);
            }

            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                return parseSuccess(response);
            }

            if (RETRYABLE_STATUSES.contains(status) && attempt < maxRetries) {
                String retryAfter = response.headers().firstValue("retry-after").orElse(null);
                sleep(backoffDelay(attempt, retryAfter));
                attempt++;
                continue;
            }

            throw exceptionFromResponse(status, response.body());
        }

        throw new NetworkException(
                lastError != null ? lastError.getMessage() : "Request failed after retries.",
                lastError);
    }

    private Object parseSuccess(HttpResponse<String> response) {
        int status = response.statusCode();
        if (status == 204) return null;
        String body = response.body();
        if (body == null || body.isEmpty()) return null;
        String contentType = response.headers().firstValue("content-type").orElse("");
        if (!contentType.contains("application/json")) {
            return body;
        }
        try {
            char c = firstNonWhitespace(body);
            if (c == '[') {
                return MAPPER.readValue(body, new TypeReference<List<Object>>() {});
            }
            return MAPPER.readValue(body, MAP_TYPE);
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse response JSON", e);
        }
    }

    private MissionInboxException exceptionFromResponse(int status, String rawBody) {
        Map<String, Object> body = safeDecode(rawBody);
        String message = extractMessage(body);
        if (message.isEmpty()) message = "HTTP " + status;
        String lower = message.toLowerCase(Locale.ROOT);

        if (status == 401) return new AuthenticationException(message, status, body);
        if (status == 403) {
            if (lower.contains("is not a registered sending identifier"))
                return new UnregisteredSenderException(message, status, body);
            if (lower.contains("not verified for sending"))
                return new UnverifiedDomainException(message, status, body);
            if (lower.contains("subscription is not active"))
                return new SubscriptionInactiveException(message, status, body);
            if (lower.contains("send limit"))
                return new SendLimitExceededException(message, status, body);
            if (lower.contains("disabled for sending") || lower.contains("listed on"))
                return new DomainBlacklistedException(message, status, body);
            return new PermissionException(message, status, body);
        }
        if (status == 404) return new NotFoundException(message, status, body);
        if (status == 409) return new ConflictException(message, status, body);
        if (status == 422) return new SendException(message, status, body);
        if (status == 429) return new RateLimitException(message, status, body);
        if (status >= 500) return new ServerException(message, status, body);
        if (status >= 400) return new ValidationException(message, status, body);
        return new MissionInboxException(message, status, body);
    }

    private Map<String, Object> safeDecode(String body) {
        if (body == null || body.isEmpty()) return null;
        try {
            return MAPPER.readValue(body, MAP_TYPE);
        } catch (IOException e) {
            return null;
        }
    }

    private String extractMessage(Map<String, Object> body) {
        if (body == null) return "";
        Object m = body.get("message");
        if (m instanceof String) return (String) m;
        if (m instanceof List<?>) {
            StringBuilder sb = new StringBuilder();
            for (Object entry : (List<?>) m) {
                if (entry == null) continue;
                if (sb.length() > 0) sb.append("; ");
                sb.append(entry);
            }
            return sb.toString();
        }
        return "";
    }

    private String buildQuery(Map<String, Object> query) {
        if (query == null || query.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> entry : query.entrySet()) {
            Object value = entry.getValue();
            if (value == null) continue;
            if (value instanceof List<?>) {
                for (Object v : (List<?>) value) {
                    if (v == null) continue;
                    appendPair(sb, entry.getKey(), v);
                }
            } else {
                appendPair(sb, entry.getKey(), value);
            }
        }
        return sb.length() == 0 ? "" : "?" + sb;
    }

    private void appendPair(StringBuilder sb, String key, Object value) {
        if (sb.length() > 0) sb.append('&');
        sb.append(URLEncoder.encode(key, StandardCharsets.UTF_8))
                .append('=')
                .append(URLEncoder.encode(stringify(value), StandardCharsets.UTF_8));
    }

    private String stringify(Object v) {
        if (v instanceof Boolean) return ((Boolean) v) ? "true" : "false";
        return String.valueOf(v);
    }

    private long backoffDelay(int attempt, String retryAfter) {
        if (retryAfter != null) {
            try {
                double seconds = Double.parseDouble(retryAfter);
                if (seconds > 0) {
                    return (long) Math.min(seconds * 1000, 30_000);
                }
            } catch (NumberFormatException ignored) {
                // fall through to jittered backoff
            }
        }
        long base = 250L * (1L << attempt);
        long jitter = (long) (ThreadLocalRandom.current().nextDouble() * base * 0.25);
        return Math.min(base + jitter, 8_000);
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static boolean methodRequiresBody(String method) {
        return "POST".equals(method) || "PATCH".equals(method) || "PUT".equals(method);
    }

    private static char firstNonWhitespace(String s) {
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (!Character.isWhitespace(c)) return c;
        }
        return '\0';
    }

    private static String stripTrailingSlashes(String s) {
        Objects.requireNonNull(s);
        int end = s.length();
        while (end > 0 && s.charAt(end - 1) == '/') end--;
        return s.substring(0, end);
    }
}
