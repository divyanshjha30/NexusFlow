package com.nexusflow.common.events;

import java.time.Instant;
import java.util.UUID;

/** Emitted when the AI pipeline finishes, successfully or otherwise. */
public record AiCompleteEvent(
        UUID eventId,
        UUID documentId,
        UUID userId,
        UUID correlationId,
        String documentType,
        int chunksEmbedded,
        long processingTimeMs,
        boolean success,
        String errorMessage,
        Instant timestamp) {
    public static AiCompleteEvent success(UUID documentId, UUID userId, UUID correlationId,
            String documentType, int chunksEmbedded, long processingTimeMs) {
        return new AiCompleteEvent(UUID.randomUUID(), documentId, userId, correlationId,
                documentType, chunksEmbedded, processingTimeMs, true, null, Instant.now());
    }

    public static AiCompleteEvent failure(UUID documentId, UUID userId, UUID correlationId, String error) {
        return new AiCompleteEvent(UUID.randomUUID(), documentId, userId, correlationId,
                null, 0, 0, false, error, Instant.now());
    }
}
