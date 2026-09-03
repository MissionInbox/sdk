package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 5xx after retries have been exhausted. */
public class ServerException extends MissionInboxException {
    public ServerException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
