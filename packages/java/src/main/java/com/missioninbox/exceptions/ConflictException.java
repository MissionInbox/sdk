package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 409 — resource already exists. */
public class ConflictException extends MissionInboxException {
    public ConflictException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
