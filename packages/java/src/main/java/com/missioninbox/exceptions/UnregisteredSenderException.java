package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 403 when the `from` address hasn't been registered as a sending identifier. */
public class UnregisteredSenderException extends PermissionException {
    public UnregisteredSenderException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
