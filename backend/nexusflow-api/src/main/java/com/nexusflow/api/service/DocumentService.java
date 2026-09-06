package com.nexusflow.api.service;

import com.nexusflow.api.repository.DocumentRepository;
import com.nexusflow.common.dto.DocumentDto;
import com.nexusflow.common.dto.PageDto;
import com.nexusflow.common.enums.DocumentStatus;
import com.nexusflow.common.events.DocumentDeletedEvent;
import com.nexusflow.common.events.FileUploadedEvent;
import com.nexusflow.common.events.Topics;
import com.nexusflow.common.exception.DocumentNotFoundException;
import com.nexusflow.common.exception.NexusFlowException;
import com.nexusflow.events.EventPublisher;
import com.nexusflow.storage.service.S3StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final DocumentRepository repository;
    private final S3StorageService s3;
    private final EventPublisher events;

    public DocumentService(DocumentRepository repository, S3StorageService s3, EventPublisher events) {
        this.repository = repository;
        this.s3 = s3;
        this.events = events;
    }

    public PageDto<DocumentDto> list(DocumentRepository.Filter filter) {
        List<DocumentDto> content = repository.find(filter);
        long total = repository.count(filter);
        return PageDto.of(content, filter.page(), filter.size(), total);
    }

    public DocumentDto get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new DocumentNotFoundException(id));
    }

    /**
     * Writes the primary copy synchronously so the bytes are durable, then hands
     * the rest of the pipeline to Kafka and returns immediately.
     */
    public UUID upload(MultipartFile file, UUID userId) {
        UUID id = UUID.randomUUID();
        String original = file.getOriginalFilename() == null ? "untitled" : file.getOriginalFilename();
        String safeName = original.replaceAll("[^A-Za-z0-9._-]", "_");
        String key = "documents/%s/%s".formatted(id, safeName);
        String mime = file.getContentType() == null ? "application/octet-stream" : file.getContentType();

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new NexusFlowException("FILE_READ_FAILED", "Could not read uploaded file", e);
        }

        repository.insert(new DocumentRepository.NewDocument(
                id, userId, safeName, original, mime, file.getSize(),
                DocumentStatus.UPLOADING.name(), null));

        try {
            s3.upload(key, mime, bytes);
            repository.markStored(id, "s3_key", key);
        } catch (Exception e) {
            repository.updateStatus(id, DocumentStatus.FAILED.name());
            throw new NexusFlowException("PRIMARY_STORAGE_FAILED",
                    "Could not store the primary copy: " + e.getMessage(), e);
        }

        events.publish(Topics.FILE_UPLOADED, id, FileUploadedEvent.of(
                id, userId, safeName, original, mime, file.getSize(), key));

        log.info("Queued {} for replication and analysis", id);
        return id;
    }

    public void delete(UUID id, UUID userId) {
        DocumentDto doc = get(id);
        repository.softDelete(id);
        events.publish(Topics.DOCUMENT_DELETED, id, DocumentDeletedEvent.of(
                id, userId, doc.storageLocations().awsS3Url()));
    }

    public void setArchived(UUID id, boolean archived) {
        get(id);
        repository.setArchived(id, archived);
    }

    public long storageUsed(UUID userId) {
        return repository.totalBytesForUser(userId);
    }
}
