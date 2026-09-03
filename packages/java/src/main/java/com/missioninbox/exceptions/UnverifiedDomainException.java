package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 403 when the sending identifier's domain has not completed DNS/MTA verification. */
public class UnverifiedDomainException extends PermissionException {
    public UnverifiedDomainException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
