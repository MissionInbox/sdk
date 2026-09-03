package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 401 — the API key is missing, malformed, or invalid. */
public class AuthenticationException extends MissionInboxException {
    public AuthenticationException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
