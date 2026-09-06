package com.nexusflow.api.consumer;

import com.nexusflow.api.repository.EmbeddingRepository;
import com.nexusflow.common.events.DocumentDeletedEvent;
import com.nexusflow.common.events.Topics;
import com.nexusflow.storage.service.StorageOrchestrator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Reclaims storage after a soft delete: the row stays for audit, but the
 * replicas and their embeddings do not.
 */
@Component
public class DocumentDeletedConsumer {

    private static final Logger log = LoggerFactory.getLogger(DocumentDeletedConsumer.class);

    private final StorageOrchestrator storage;
    private final EmbeddingRepository embeddings;

    public DocumentDeletedConsumer(StorageOrchestrator storage, EmbeddingRepository embeddings) {
        this.storage = storage;
        this.embeddings = embeddings;
    }

    @KafkaListener(topics = Topics.DOCUMENT_DELETED, groupId = "nexusflow-cleanup-group")
    public void onDeleted(DocumentDeletedEvent event) {
        embeddings.deleteFor(event.documentId());

        if (event.storageKey() == null || event.storageKey().isBlank()) {
            log.info("Document {} had no replicas to purge", event.documentId());
            return;
        }

        long purged = storage.purge(event.storageKey()).stream()
                .filter(StorageOrchestrator.Result::success)
                .count();

        log.info("Purged {} of 4 replicas for document {}", purged, event.documentId());
    }
}
