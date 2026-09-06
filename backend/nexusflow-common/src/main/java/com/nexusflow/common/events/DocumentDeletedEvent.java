package com.nexusflow.common.events;

import java.time.Instant;
import java.util.UUID;

/**
 * Emitted when a document is removed, so replicas can be purged from every
 * cloud.
 */
public record DocumentDeletedEvent(
        UUID eventId,
        UUID documentId,
        UUID userId,
        String storageKey,
        Instant timestamp) {

    public static DocumentDeletedEvent of(UUID documentId, UUID userId, String storageKey) {
        return new DocumentDeletedEvent(UUID.randomUUID(), documentId, userId, storageKey, Instant.now());
    }
}
