package com.nexusflow.api.config;

import com.nexusflow.common.exception.DocumentNotFoundException;
import com.nexusflow.common.exception.NexusFlowException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(DocumentNotFoundException e) {
        return build(HttpStatus.NOT_FOUND, e.getErrorCode(), e.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> tooLarge(MaxUploadSizeExceededException e) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", e.getMessage());
    }

    @ExceptionHandler(NexusFlowException.class)
    public ResponseEntity<Map<String, Object>> domain(NexusFlowException e) {
        log.warn("Domain error {}: {}", e.getErrorCode(), e.getMessage());
        return build(HttpStatus.BAD_REQUEST, e.getErrorCode(), e.getMessage());
    }

    /**
     * The response is already streaming by this point, so returning a body would
     * splice JSON into the middle of the text the user is reading.
     */
    @ExceptionHandler(AsyncRequestTimeoutException.class)
    public void asyncTimeout(AsyncRequestTimeoutException e) {
        log.warn("Streaming response timed out before completion");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> unexpected(Exception e) {
        log.error("Unhandled error", e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", e.getMessage());
    }

    private static ResponseEntity<Map<String, Object>> build(HttpStatus status, String code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", code);
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(status).body(body);
    }
}
