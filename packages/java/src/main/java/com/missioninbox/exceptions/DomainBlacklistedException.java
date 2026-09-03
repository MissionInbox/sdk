package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 403 when the domain has been disabled for sending (e.g. blacklist). */
public class DomainBlacklistedException extends PermissionException {
    public DomainBlacklistedException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
