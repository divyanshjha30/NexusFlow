package com.nexusflow.api.consumer;

import com.nexusflow.common.events.AiCompleteEvent;
import com.nexusflow.common.events.FileStoredEvent;
import com.nexusflow.common.events.Topics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Compliance trail: every storage and AI outcome is logged independently of the
 * pipeline that produced it, so a failure there does not lose the record.
 */
@Component
public class AuditConsumer {

    private static final Logger log = LoggerFactory.getLogger(AuditConsumer.class);

    @KafkaListener(topics = Topics.FILE_STORED, groupId = "nexusflow-audit-group")
    public void onStored(FileStoredEvent event) {
        log.info("AUDIT stored document={} cloud={} key={} durationMs={}",
                event.documentId(), event.cloudProvider(), event.storageKey(), event.durationMs());
    }

    @KafkaListener(topics = Topics.FILE_STORED_FAILED, groupId = "nexusflow-audit-group")
    public void onStoreFailed(FileStoredEvent event) {
        log.warn("AUDIT store-failed document={} cloud={} error={}",
                event.documentId(), event.cloudProvider(), event.errorMessage());
    }

    @KafkaListener(topics = Topics.AI_COMPLETE, groupId = "nexusflow-audit-group")
    public void onAiComplete(AiCompleteEvent event) {
        log.info("AUDIT ai-complete document={} type={} chunks={} durationMs={}",
                event.documentId(), event.documentType(), event.chunksEmbedded(), event.processingTimeMs());
    }

    @KafkaListener(topics = Topics.AI_FAILED, groupId = "nexusflow-audit-group")
    public void onAiFailed(AiCompleteEvent event) {
        log.warn("AUDIT ai-failed document={} error={}", event.documentId(), event.errorMessage());
    }
}
