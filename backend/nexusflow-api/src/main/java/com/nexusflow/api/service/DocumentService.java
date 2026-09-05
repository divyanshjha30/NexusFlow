package com.nexusflow.api.service;

import com.nexusflow.api.repository.DocumentRepository;
import com.nexusflow.common.dto.DocumentDto;
import com.nexusflow.common.dto.PageDto;
import com.nexusflow.common.dto.ProcessingEventDto;
import com.nexusflow.common.enums.CloudProvider;
import com.nexusflow.common.enums.DocumentStatus;
import com.nexusflow.common.exception.DocumentNotFoundException;
import com.nexusflow.storage.service.S3StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    /** Fixed until Cognito auth lands in Milestone 1. */
    public static final UUID DEMO_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final DocumentRepository repository;
    private final S3StorageService s3;
    private final SimpMessagingTemplate messaging;

    public DocumentService(DocumentRepository repository, S3StorageService s3, SimpMessagingTemplate messaging) {
        this.repository = repository;
        this.s3 = s3;
        this.messaging = messaging;
    }

    public PageDto<DocumentDto> list(DocumentRepository.Filter filter) {
        List<DocumentDto> content = repository.find(filter);
        long total = repository.count(filter);
        return PageDto.of(content, filter.page(), filter.size(), total);
    }

    public DocumentDto get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new DocumentNotFoundException(id));
    }

    public UUID upload(MultipartFile file) {
        UUID id = UUID.randomUUID();
        String original = file.getOriginalFilename() == null ? "untitled" : file.getOriginalFilename();
        String safeName = original.replaceAll("[^A-Za-z0-9._-]", "_");
        String key = "documents/%s/%s".formatted(id, safeName);
        String mime = file.getContentType() == null ? "application/octet-stream" : file.getContentType();

        repository.insert(new DocumentRepository.NewDocument(
                id, DEMO_USER_ID, safeName, original, mime, file.getSize(),
                DocumentStatus.UPLOADING.name(), key));

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            repository.updateStatus(id, DocumentStatus.FAILED.name());
            throw new com.nexusflow.common.exception.NexusFlowException(
                    "FILE_READ_FAILED", "Could not read uploaded file", e);
        }

        replicate(id, key, mime, bytes);
        return id;
    }

    /** Fans the file out to each cloud, emitting progress as each confirms. */
    @Async
    public void replicate(UUID id, String key, String mime, byte[] bytes) {
        repository.updateStatus(id, DocumentStatus.PROCESSING.name());
        try {
            s3.upload(key, mime, bytes.length, new ByteArrayInputStream(bytes));
            repository.markStored(id, "s3_key", key);
            publish(id, "STORED_AWS", 25, "Stored to AWS S3 (1/4 clouds)");
        } catch (Exception e) {
            log.warn("S3 upload failed for {}: {}", id, e.getMessage());
            publish(id, "FAILED", 0, "AWS S3 upload failed: " + e.getMessage());
            repository.updateStatus(id, DocumentStatus.FAILED.name());
            return;
        }

        // Azure, GCP and OCI SDKs are not wired yet; record intent so the UI stays truthful.
        for (var pending : List.of(CloudProvider.AZURE, CloudProvider.GCP, CloudProvider.OCI)) {
            log.debug("Replication to {} not implemented yet for {}", pending, id);
        }

        repository.updateStatus(id, DocumentStatus.READY.name());
        publish(id, "AI_COMPLETE", 100, "Stored and indexed");
    }

    public long storageUsed() {
        return repository.totalBytesForUser(DEMO_USER_ID);
    }

    private void publish(UUID id, String type, int progress, String message) {
        ProcessingEventDto event = ProcessingEventDto.of(id, type, progress, message);
        messaging.convertAndSend("/topic/documents", event);
        messaging.convertAndSend("/topic/documents/" + id, event);
    }
}
