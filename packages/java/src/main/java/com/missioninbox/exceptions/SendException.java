package com.missioninbox.exceptions;

import java.util.Map;

/** Thrown on HTTP 422 — the MTA rejected the message. */
public class SendException extends MissionInboxException {
    public SendException(String message, int status, Map<String, Object> body) {
        super(message, status, body);
    }
}
