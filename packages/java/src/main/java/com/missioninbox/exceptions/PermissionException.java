package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 403 when the failure doesn't match a more specific 403 subclass. */
public class PermissionException extends MissionInboxException {
    public PermissionException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
