package com.nexusflow.common.events;

import java.time.Instant;
import java.util.UUID;

/** Emitted once per cloud as replication completes or fails. */
public record FileStoredEvent(
        UUID eventId,
        UUID documentId,
        UUID userId,
        UUID correlationId,
        String cloudProvider,
        String storageKey,
        long durationMs,
        boolean success,
        String errorMessage,
        Instant timestamp) {
    public static FileStoredEvent success(UUID documentId, UUID userId, UUID correlationId,
            String cloudProvider, String storageKey, long durationMs) {
        return new FileStoredEvent(UUID.randomUUID(), documentId, userId, correlationId,
                cloudProvider, storageKey, durationMs, true, null, Instant.now());
    }

    public static FileStoredEvent failure(UUID documentId, UUID userId, UUID correlationId,
            String cloudProvider, long durationMs, String error) {
        return new FileStoredEvent(UUID.randomUUID(), documentId, userId, correlationId,
                cloudProvider, null, durationMs, false, error, Instant.now());
    }
}
