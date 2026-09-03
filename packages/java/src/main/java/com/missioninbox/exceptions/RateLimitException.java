package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 429 — too many requests. */
public class RateLimitException extends MissionInboxException {
    public RateLimitException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
