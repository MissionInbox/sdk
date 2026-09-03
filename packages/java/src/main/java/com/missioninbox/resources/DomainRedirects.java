package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Domain redirects sub-resource. Access via {@code mi.domains.redirects}. */
public final class DomainRedirects {

    private final HttpClient http;

    public DomainRedirects(HttpClient http) {
        this.http = http;
    }

    /** Return the IP + CNAME target values for manual DNS publishing. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDnsConfig() {
        return (Map<String, Object>) http.request(
                "GET", "/api/domains/redirect/dns-config", null, null);
    }

    /** Get the current redirect configuration for a domain. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String domainName) {
        return (Map<String, Object>) http.request(
                "GET", "/api/domains/" + encode(domainName) + "/redirect", null, null);
    }

    /**
     * Create or update the redirect for a domain.
     *
     * <p>Recognised keys: {@code redirectUrl} (required), {@code enabled}, {@code forceHttps}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> setup(String domainName, Map<String, Object> params) {
        return (Map<String, Object>) http.request(
                "PUT", "/api/domains/" + encode(domainName) + "/redirect", null, params);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> pushDns(String domainName) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/" + encode(domainName) + "/redirect/push-dns", null, null);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> verifyDns(String domainName) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/" + encode(domainName) + "/redirect/verify-dns", null, null);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getEvents(String domainName, Integer limit) {
        Map<String, Object> query = limit == null ? null : Collections.singletonMap("limit", limit);
        return (Map<String, Object>) http.request(
                "GET", "/api/domains/" + encode(domainName) + "/redirect/events", query, null);
    }

    public Map<String, Object> getEvents(String domainName) {
        return getEvents(domainName, null);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> delete(String domainName) {
        return (Map<String, Object>) http.request(
                "DELETE", "/api/domains/" + encode(domainName) + "/redirect", null, null);
    }

    /** Create redirects on many domains. Each item needs {@code domainName}, {@code redirectUrl}. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkSetup(List<Map<String, Object>> redirects) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("redirects", redirects);
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/redirects/bulk-setup", null, body);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkUpdate(List<Map<String, Object>> updates) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("updates", updates);
        return (Map<String, Object>) http.request(
                "PATCH", "/api/domains/redirects/bulk-update", null, body);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkDelete(List<String> domainNames) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("domainNames", domainNames);
        return (Map<String, Object>) http.request(
                "DELETE", "/api/domains/redirects/bulk-delete", null, body);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkCreateOrUpdate(List<Map<String, Object>> redirects) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("redirects", redirects);
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/redirects/bulk-create-or-update", null, body);
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
