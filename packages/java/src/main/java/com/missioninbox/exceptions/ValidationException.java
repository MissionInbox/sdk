package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 400 — request body failed validation. */
public class ValidationException extends MissionInboxException {
    public ValidationException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
