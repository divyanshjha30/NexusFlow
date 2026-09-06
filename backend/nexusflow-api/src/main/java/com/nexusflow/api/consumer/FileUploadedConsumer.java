package com.nexusflow.api.consumer;

import com.nexusflow.api.repository.DocumentRepository;
import com.nexusflow.api.service.AiPipelineService;
import com.nexusflow.api.service.ProgressPublisher;
import com.nexusflow.common.enums.CloudProvider;
import com.nexusflow.common.enums.DocumentStatus;
import com.nexusflow.common.events.AiCompleteEvent;
import com.nexusflow.common.events.FileStoredEvent;
import com.nexusflow.common.events.FileUploadedEvent;
import com.nexusflow.common.events.Topics;
import com.nexusflow.events.EventPublisher;
import com.nexusflow.storage.service.S3StorageService;
import com.nexusflow.storage.service.StorageOrchestrator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Consumes file.uploaded: replicates the primary copy to the remaining clouds,
 * then hands off to the AI pipeline. Bytes travel via S3, not through Kafka.
 */
@Component
public class FileUploadedConsumer {

    private static final Logger log = LoggerFactory.getLogger(FileUploadedConsumer.class);

    private static final Map<CloudProvider, String> KEY_COLUMN = Map.of(
            CloudProvider.AWS, "s3_key",
            CloudProvider.AZURE, "azure_blob_name",
            CloudProvider.GCP, "gcs_object_name",
            CloudProvider.OCI, "oci_object_name");

    private static final Map<CloudProvider, Integer> PROGRESS = Map.of(
            CloudProvider.AWS, 25,
            CloudProvider.AZURE, 50,
            CloudProvider.GCP, 75,
            CloudProvider.OCI, 87);

    private final S3StorageService s3;
    private final StorageOrchestrator storage;
    private final DocumentRepository documents;
    private final AiPipelineService pipeline;
    private final ProgressPublisher progressPublisher;
    private final EventPublisher events;

    public FileUploadedConsumer(
            S3StorageService s3,
            StorageOrchestrator storage,
            DocumentRepository documents,
            AiPipelineService pipeline,
            ProgressPublisher progressPublisher,
            EventPublisher events) {
        this.s3 = s3;
        this.storage = storage;
        this.documents = documents;
        this.pipeline = pipeline;
        this.progressPublisher = progressPublisher;
        this.events = events;
    }

    @KafkaListener(topics = Topics.FILE_UPLOADED, groupId = "nexusflow-storage-group")
    public void onFileUploaded(FileUploadedEvent event) {
        log.info("Replicating {} ({})", event.fileName(), event.documentId());
        documents.updateStatus(event.documentId(), DocumentStatus.PROCESSING.name());

        byte[] bytes;
        try {
            bytes = s3.download(event.s3Key());
        } catch (Exception e) {
            fail(event, "Could not read the primary copy: " + e.getMessage());
            return;
        }

        List<StorageOrchestrator.Result> results = storage.replicate(
                event.s3Key(), event.mimeType(), bytes,
                (provider, result) -> onCloudResult(event, provider, result));

        if (results.stream().noneMatch(StorageOrchestrator.Result::success)) {
            fail(event, "Every cloud rejected the upload");
            return;
        }

        runAiPipeline(event, bytes);
    }

    private void onCloudResult(FileUploadedEvent event, CloudProvider provider,
                               StorageOrchestrator.Result result) {
        if (result.success()) {
            documents.markStored(event.documentId(), KEY_COLUMN.get(provider), result.key());
            events.publish(Topics.FILE_STORED, event.documentId(),
                    FileStoredEvent.success(event.documentId(), event.userId(), event.correlationId(),
                            provider.name(), result.key(), result.durationMs()));
        } else {
            events.publish(Topics.FILE_STORED_FAILED, event.documentId(),
                    FileStoredEvent.failure(event.documentId(), event.userId(), event.correlationId(),
                            provider.name(), result.durationMs(), result.error()));
        }

        progressPublisher.publish(event.documentId(), event.userId(),
                "STORED_" + provider.name(), PROGRESS.getOrDefault(provider, 50),
                result.success() ? "Stored to " + provider
                        : "%s failed: %s".formatted(provider, result.error()),
                provider.name(), (int) result.durationMs());
    }

    private void runAiPipeline(FileUploadedEvent event, byte[] bytes) {
        long start = System.currentTimeMillis();
        try {
            AiPipelineService.Outcome outcome =
                    pipeline.run(event.documentId(), event.userId(), event.fileName(), bytes);

            events.publish(Topics.AI_COMPLETE, event.documentId(),
                    AiCompleteEvent.success(event.documentId(), event.userId(), event.correlationId(),
                            outcome.documentType(), outcome.chunksEmbedded(),
                            System.currentTimeMillis() - start));
        } catch (Exception e) {
            log.error("AI pipeline failed for {}", event.documentId(), e);
            events.publish(Topics.AI_FAILED, event.documentId(),
                    AiCompleteEvent.failure(event.documentId(), event.userId(),
                            event.correlationId(), e.getMessage()));
        }
    }

    private void fail(FileUploadedEvent event, String message) {
        log.error("{} for {}", message, event.documentId());
        documents.updateStatus(event.documentId(), DocumentStatus.FAILED.name());
        progressPublisher.publish(event.documentId(), event.userId(), "FAILED", 0, message);
        events.publish(Topics.AI_FAILED, event.documentId(),
                AiCompleteEvent.failure(event.documentId(), event.userId(), event.correlationId(), message));
    }
}
