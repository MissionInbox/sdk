package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

/**
 * The {@code health} resource. Access via {@code mi.health}.
 *
 * <p>Unauthenticated endpoint. Returns the API's health string on success.
 */
public final class Health {

    private final HttpClient http;

    public Health(HttpClient http) {
        this.http = http;
    }

    /** Ping the API. */
    public Object check() {
        return http.request("GET", "/api/health", null, null);
    }
}
