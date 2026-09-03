package com.missioninbox.exceptions;

import java.util.Collections;
import java.util.Map;

/**
 * Base class for every exception thrown by the MissionInbox SDK.
 *
 * <p>Catch this to handle any SDK-originated failure, or catch a specific
 * subclass to react to a specific failure mode.
 */
public class MissionInboxException extends RuntimeException {

    private final int status;
    private final Map<String, Object> body;

    public MissionInboxException(String message, int status, Map<String, Object> body) {
        super(message);
        this.status = status;
        this.body = body == null ? Collections.emptyMap() : body;
    }

    public MissionInboxException(String message, int status, Map<String, Object> body, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.body = body == null ? Collections.emptyMap() : body;
    }

    /** HTTP status code, or 0 for network / transport errors. */
    public int getStatus() {
        return status;
    }

    /** Parsed response body when available; empty map otherwise. */
    public Map<String, Object> getBody() {
        return body;
    }
}
