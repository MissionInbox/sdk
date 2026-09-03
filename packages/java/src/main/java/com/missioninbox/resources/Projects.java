package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/** The {@code projects} resource. Access via {@code mi.projects}. */
public final class Projects {

    private final HttpClient http;

    public Projects(HttpClient http) {
        this.http = http;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> list() {
        return (List<Map<String, Object>>) http.request("GET", "/api/projects", null, null);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String id) {
        return (Map<String, Object>) http.request("GET", "/api/projects/" + encode(id), null, null);
    }

    /** Create a project. {@code params} needs {@code name}. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> create(Map<String, Object> params) {
        return (Map<String, Object>) http.request("POST", "/api/projects", null, params);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> update(String id, Map<String, Object> params) {
        return (Map<String, Object>) http.request(
                "PATCH", "/api/projects/" + encode(id), null, params);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> delete(String id) {
        return (Map<String, Object>) http.request(
                "DELETE", "/api/projects/" + encode(id), null, null);
    }

    /** Move domains into this project. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> assignDomains(String id, List<String> domainNames) {
        return (Map<String, Object>) http.request(
                "PATCH", "/api/projects/" + encode(id) + "/domains", null,
                Collections.singletonMap("domainNames", domainNames));
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
