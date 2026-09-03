package com.missioninbox.resources;

import com.missioninbox.http.HttpClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The {@code analytics} resource. Access via {@code mi.analytics}. */
public final class Analytics {

    private final HttpClient http;

    public Analytics(HttpClient http) {
        this.http = http;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getOverview() {
        return (Map<String, Object>) http.request("GET", "/api/analytics/overview", null, null);
    }

    /**
     * Time-series data for send/receive activity.
     *
     * @param granularity One of {@code hourly}, {@code daily}, {@code monthly}, {@code yearly}.
     * @param startDate ISO 8601 timestamp.
     * @param endDate ISO 8601 timestamp.
     * @param counters Optional list of {@code incoming}, {@code outgoing}, {@code bounces},
     *                 {@code spam}, {@code held}. Pass {@code null} to include all.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getActivityGraph(
            String granularity, String startDate, String endDate, List<String> counters) {
        Map<String, Object> query = new LinkedHashMap<>();
        query.put("granularity", granularity);
        query.put("startDate", startDate);
        query.put("endDate", endDate);
        if (counters != null && !counters.isEmpty()) query.put("counters", counters);
        return (Map<String, Object>) http.request("GET", "/api/analytics/activity-graph", query, null);
    }

    public Map<String, Object> getActivityGraph(String granularity, String startDate, String endDate) {
        return getActivityGraph(granularity, startDate, endDate, null);
    }
}
