package com.nexusflow.common.dto;

public record StorageLocationsDto(
        String awsS3Url,
        String azureBlobUrl,
        String gcpStorageUrl,
        String ociObjectUrl,
        boolean isArchived) {
}
