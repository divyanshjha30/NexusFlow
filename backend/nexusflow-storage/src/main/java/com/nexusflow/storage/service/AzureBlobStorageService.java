package com.nexusflow.storage.service;

import com.azure.core.util.BinaryData;
import com.azure.core.util.Context;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.models.BlobStorageException;
import com.azure.storage.blob.options.BlobParallelUploadOptions;
import com.azure.storage.common.StorageSharedKeyCredential;
import com.nexusflow.common.enums.CloudProvider;
import com.nexusflow.common.exception.NexusFlowException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AzureBlobStorageService implements CloudStorage {

    private static final Logger log = LoggerFactory.getLogger(AzureBlobStorageService.class);

    private final BlobServiceClient client;
    private final String container;
    private final boolean configured;

    public AzureBlobStorageService(
            @Value("${nexusflow.azure.endpoint}") String endpoint,
            @Value("${nexusflow.azure.account}") String account,
            @Value("${nexusflow.azure.key}") String key,
            @Value("${nexusflow.azure.container}") String container) {

        this.container = container;
        this.configured = key != null && !key.isBlank();

        if (!configured) {
            log.warn("AZURE_STORAGE_KEY is not set — Azure replication is disabled.");
            this.client = null;
        } else {
            this.client = new BlobServiceClientBuilder()
                    // Azurite-style emulators expose the account as a path segment.
                    .endpoint(endpoint + "/" + account)
                    .credential(new StorageSharedKeyCredential(account, key))
                    .buildClient();
        }
    }

    @Override
    public CloudProvider provider() {
        return CloudProvider.AZURE;
    }

    @Override
    public String upload(String key, String contentType, byte[] bytes) {
        requireConfigured();
        try {
            BlobContainerClient containerClient = ensureContainer();
            // Content type must ride along with the upload: the emulator does not
            // implement Set Blob Properties (returns 501).
            containerClient.getBlobClient(key).uploadWithResponse(
                    new BlobParallelUploadOptions(BinaryData.fromBytes(bytes))
                            .setHeaders(new BlobHttpHeaders().setContentType(contentType)),
                    null,
                    Context.NONE);
            return key;
        } catch (BlobStorageException e) {
            throw new NexusFlowException("AZURE_UPLOAD_FAILED", "Could not upload " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        requireConfigured();
        try {
            client.getBlobContainerClient(container).getBlobClient(key).deleteIfExists();
        } catch (BlobStorageException e) {
            throw new NexusFlowException("AZURE_DELETE_FAILED", "Could not delete " + key, e);
        }
    }

    @Override
    public long objectCount() {
        if (!configured) return 0;
        try {
            return client.getBlobContainerClient(container).listBlobs().stream().count();
        } catch (Exception e) {
            log.debug("Could not count blobs in {}: {}", container, e.getMessage());
            return 0;
        }
    }

    private void requireConfigured() {
        if (!configured) {
            throw new NexusFlowException("AZURE_NOT_CONFIGURED",
                    "Set AZURE_STORAGE_KEY to enable Azure Blob replication");
        }
    }

    private BlobContainerClient ensureContainer() {
        BlobContainerClient c = client.getBlobContainerClient(container);
        if (!c.exists()) {
            c.create();
        }
        return c;
    }
}
