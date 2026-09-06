package com.nexusflow.common.events;

import java.time.Instant;
import java.util.UUID;

/** Published when a file has landed in primary storage and needs processing. */
public record FileUploadedEvent(
        UUID eventId,
        UUID documentId,
        UUID userId,
        UUID correlationId,
        String fileName,
        String originalName,
        String mimeType,
        long fileSizeBytes,
        String s3Key,
        Instant timestamp) {
    public static FileUploadedEvent of(UUID documentId, UUID userId, String fileName,
            String originalName, String mimeType,
            long fileSizeBytes, String s3Key) {
        return new FileUploadedEvent(
                UUID.randomUUID(), documentId, userId, UUID.randomUUID(),
                fileName, originalName, mimeType, fileSizeBytes, s3Key, Instant.now());
    }
}
