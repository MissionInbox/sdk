package com.missioninbox.exceptions;

/** Thrown when the request failed at the transport layer (DNS, connection reset, timeout). */
public class NetworkException extends MissionInboxException {
    public NetworkException(String message, Throwable cause) {
        super(message, 0, null, cause);
    }
}
