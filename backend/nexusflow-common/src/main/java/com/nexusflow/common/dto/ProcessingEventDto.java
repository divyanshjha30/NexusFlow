package com.nexusflow.common.dto;

import java.time.Instant;
import java.util.UUID;

/** Pushed to /topic/documents as a document moves through the pipeline. */
public record ProcessingEventDto(
        UUID documentId,
        String eventType,
        int progress,
        String message,
        Instant timestamp) {
    public static ProcessingEventDto of(UUID documentId, String eventType, int progress, String message) {
        return new ProcessingEventDto(documentId, eventType, progress, message, Instant.now());
    }
}
