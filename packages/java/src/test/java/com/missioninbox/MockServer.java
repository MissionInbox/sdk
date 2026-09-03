package com.missioninbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

/**
 * A tiny stdlib-only HTTP mock server for tests. Queue responses in order;
 * inspect the captured requests afterwards.
 */
final class MockServer implements AutoCloseable {

    static final ObjectMapper MAPPER = new ObjectMapper();

    private final HttpServer server;
    private final Queue<Response> responses = new LinkedList<>();
    private final List<CapturedRequest> requests = new ArrayList<>();
    private final int port;
    /** When true, the last-enqueued response is reused for subsequent requests. */
    private boolean reuseLast = false;

    MockServer() throws IOException {
        this.server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        this.port = server.getAddress().getPort();
        server.createContext("/", this::handle);
        server.setExecutor(null);
        server.start();
    }

    String baseUrl() {
        return "http://127.0.0.1:" + port;
    }

    /** Reuse the last-enqueued response after the queue drains — useful for {@code waitFor} timeout tests. */
    void reuseLastResponse() {
        this.reuseLast = true;
    }

    void enqueue(int status, String contentType, String body) {
        responses.add(new Response(status, contentType, body));
    }

    void enqueueJson(int status, Object body) {
        try {
            responses.add(new Response(status, "application/json", MAPPER.writeValueAsString(body)));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    List<CapturedRequest> capturedRequests() {
        return requests;
    }

    CapturedRequest lastRequest() {
        return requests.get(requests.size() - 1);
    }

    @Override
    public void close() {
        server.stop(0);
    }

    private void handle(HttpExchange exchange) throws IOException {
        String body;
        try (InputStream in = exchange.getRequestBody()) {
            body = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        java.util.Map<String, String> headers = new java.util.HashMap<>();
        for (java.util.Map.Entry<String, java.util.List<String>> e : exchange.getRequestHeaders().entrySet()) {
            if (e.getValue() != null && !e.getValue().isEmpty()) {
                // Lower-case keys — HttpExchange normalises inconsistently across JVMs.
                headers.put(e.getKey().toLowerCase(java.util.Locale.ROOT), e.getValue().get(0));
            }
        }
        requests.add(new CapturedRequest(
                exchange.getRequestMethod(),
                exchange.getRequestURI().getPath(),
                exchange.getRequestURI().getRawQuery(),
                headers,
                body
        ));

        Response r = responses.poll();
        if (r == null) {
            r = reuseLast && !requests.isEmpty()
                    ? new Response(200, "application/json", "{}")
                    : new Response(200, "application/json", "{}");
        } else if (reuseLast && responses.isEmpty()) {
            responses.add(r);
        }

        byte[] bytes = r.body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", r.contentType);
        exchange.sendResponseHeaders(r.status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    static final class Response {
        final int status;
        final String contentType;
        final String body;

        Response(int status, String contentType, String body) {
            this.status = status;
            this.contentType = contentType;
            this.body = body;
        }
    }

    static final class CapturedRequest {
        final String method;
        final String path;
        final String rawQuery;
        final java.util.Map<String, String> headers;
        final String body;

        CapturedRequest(String method, String path, String rawQuery,
                        java.util.Map<String, String> headers, String body) {
            this.method = method;
            this.path = path;
            this.rawQuery = rawQuery;
            this.headers = headers;
            this.body = body;
        }
    }
}
