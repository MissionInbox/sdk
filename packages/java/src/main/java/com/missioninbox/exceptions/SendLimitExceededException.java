package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 403 when the plan's daily or monthly send cap has been reached. */
public class SendLimitExceededException extends PermissionException {
    public SendLimitExceededException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
