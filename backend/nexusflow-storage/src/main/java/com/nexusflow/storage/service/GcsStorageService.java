package com.nexusflow.storage.service;

import com.google.api.gax.paging.Page;
import com.google.cloud.NoCredentials;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.BucketInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import com.google.cloud.storage.StorageOptions;
import com.nexusflow.common.enums.CloudProvider;
import com.nexusflow.common.exception.NexusFlowException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GcsStorageService implements CloudStorage {

    private static final Logger log = LoggerFactory.getLogger(GcsStorageService.class);

    private final Storage storage;
    private final String bucket;

    public GcsStorageService(
            @Value("${nexusflow.gcp.endpoint}") String endpoint,
            @Value("${nexusflow.gcp.project}") String project,
            @Value("${nexusflow.gcp.bucket}") String bucket) {

        this.bucket = bucket;
        this.storage = StorageOptions.newBuilder()
                .setHost(endpoint)
                .setProjectId(project)
                .setCredentials(NoCredentials.getInstance())
                .build()
                .getService();
    }

    @Override
    public CloudProvider provider() {
        return CloudProvider.GCP;
    }

    @Override
    public String upload(String key, String contentType, byte[] bytes) {
        try {
            ensureBucket();
            BlobInfo info = BlobInfo.newBuilder(BlobId.of(bucket, key))
                    .setContentType(contentType)
                    .build();
            storage.create(info, bytes);
            return key;
        } catch (StorageException e) {
            throw new NexusFlowException("GCS_UPLOAD_FAILED", "Could not upload " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            storage.delete(BlobId.of(bucket, key));
        } catch (StorageException e) {
            throw new NexusFlowException("GCS_DELETE_FAILED", "Could not delete " + key, e);
        }
    }

    @Override
    public long objectCount() {
        try {
            Page<Blob> page = storage.list(bucket);
            return page.streamAll().count();
        } catch (Exception e) {
            log.debug("Could not count objects in {}: {}", bucket, e.getMessage());
            return 0;
        }
    }

    private void ensureBucket() {
        if (storage.get(bucket) == null) {
            storage.create(BucketInfo.of(bucket));
        }
    }
}
