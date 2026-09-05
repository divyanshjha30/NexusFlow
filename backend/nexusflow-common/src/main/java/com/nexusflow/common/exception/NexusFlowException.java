package com.nexusflow.common.exception;

public class NexusFlowException extends RuntimeException {

    private final String errorCode;

    public NexusFlowException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public NexusFlowException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
