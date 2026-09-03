package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The {@code domains} resource. Access via {@code mi.domains}. */
public final class Domains {

    private final HttpClient http;
    /** Nested redirect management. */
    public final DomainRedirects redirects;

    public Domains(HttpClient http) {
        this.http = http;
        this.redirects = new DomainRedirects(http);
    }

    /** List domains with optional filters. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> list(Map<String, Object> params) {
        return (Map<String, Object>) http.request("GET", "/api/domains", params, null);
    }

    public Map<String, Object> list() {
        return list(null);
    }

    /** Retrieve a domain by UUID. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String id) {
        return (Map<String, Object>) http.request(
                "GET", "/api/domains/by-id/" + encode(id), null, null);
    }

    /** Retrieve a domain by name (with published DNS records). */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getByName(String domainName) {
        return (Map<String, Object>) http.request(
                "GET", "/api/domains/" + encode(domainName), null, null);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getStatistics() {
        return (Map<String, Object>) http.request("GET", "/api/domains/statistic", null, null);
    }

    /** Export domains as CSV. Accepts the same filters as {@link #list}. */
    public String exportCsv(Map<String, Object> params) {
        Object result = http.request("GET", "/api/domains/export", params, null);
        return result instanceof String ? (String) result : "";
    }

    public String exportCsv() {
        return exportCsv(null);
    }

    /** List admin/postmaster/abuse mailboxes for a domain. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getAdminMailboxes(String domainName) {
        return (Map<String, Object>) http.request(
                "GET", "/api/domains/" + encode(domainName) + "/admin-mailboxes", null, null);
    }

    /**
     * Register a new domain.
     *
     * <p>Recognised keys: {@code domainName} (required), {@code projectId}, {@code redirectUrl}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> create(Map<String, Object> params) {
        return (Map<String, Object>) http.request("POST", "/api/domains/create", null, params);
    }

    /**
     * Register many domains. {@code domains} is a list of items each with
     * {@code domainName} plus optional {@code projectName} / {@code redirectUrl}.
     * Returns a task response.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkCreate(List<Map<String, Object>> domains) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/bulk-create", null,
                Collections.singletonMap("domains", domains));
    }

    /** Trigger DNS verification for a single domain. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> verify(String domainName) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/verify", null,
                Collections.singletonMap("domainName", domainName));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkVerify(List<String> domainNames) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/bulk-verify", null,
                Collections.singletonMap("domainNames", domainNames));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> pushDns(String domainName) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/push-dns", null,
                Collections.singletonMap("domainName", domainName));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkPushDns(List<String> domainNames) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/bulk-push-dns", null,
                Collections.singletonMap("domainNames", domainNames));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> repushDns(String domainName) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/repush", null,
                Collections.singletonMap("domainName", domainName));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkRepushDns(List<String> domainNames) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/bulk-repush", null,
                Collections.singletonMap("domainNames", domainNames));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> cleanDns(String domainName) {
        return (Map<String, Object>) http.request(
                "DELETE", "/api/domains/" + encode(domainName) + "/dns", null, null);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> delete(String domainName) {
        return (Map<String, Object>) http.request(
                "DELETE", "/api/domains/" + encode(domainName), null, null);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkDelete(List<String> domainNames) {
        return (Map<String, Object>) http.request(
                "POST", "/api/domains/bulk-delete", null,
                Collections.singletonMap("domainNames", domainNames));
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
