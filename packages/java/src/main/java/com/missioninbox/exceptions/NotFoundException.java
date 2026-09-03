package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 404 — resource not found. */
public class NotFoundException extends MissionInboxException {
    public NotFoundException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
