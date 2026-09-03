package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The {@code sendingIdentifiers} resource. Access via {@code mi.sendingIdentifiers}.
 *
 * <p>A sending identifier is an approved {@code From:} address on the account.
 * It is not a mailbox — no inbox, no password, no IMAP.
 */
public final class SendingIdentifiers {

    private final HttpClient http;

    public SendingIdentifiers(HttpClient http) {
        this.http = http;
    }

    /** List every registered sending identifier. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> list() {
        return (List<Map<String, Object>>) http.request(
                "GET", "/api/sending-identifiers", null, null);
    }

    /** Retrieve a single identifier by UUID. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String id) {
        return (Map<String, Object>) http.request(
                "GET", "/api/sending-identifiers/" + encode(id), null, null);
    }

    /**
     * Register a new sending identifier.
     *
     * <p>Recognised keys: {@code emailAddress} (required), {@code displayName}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> create(Map<String, Object> params) {
        return (Map<String, Object>) http.request(
                "POST", "/api/sending-identifiers", null, params);
    }

    /** Update the identifier's display name. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> update(String id, Map<String, Object> params) {
        return (Map<String, Object>) http.request(
                "PATCH", "/api/sending-identifiers/" + encode(id), null, params);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> delete(String id) {
        return (Map<String, Object>) http.request(
                "DELETE", "/api/sending-identifiers/" + encode(id), null, null);
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
