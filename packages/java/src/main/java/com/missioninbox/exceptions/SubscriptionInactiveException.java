package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 403 when the account's subscription is not active. */
public class SubscriptionInactiveException extends PermissionException {
    public SubscriptionInactiveException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
