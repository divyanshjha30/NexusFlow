package com.nexusflow.common.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record DocumentDto(
        UUID id,
        String fileName,
        String mimeType,
        long fileSizeBytes,
        String documentType,
        String status,
        String summary,
        List<String> aiTags,
        Map<String, List<String>> entities,
        String sentiment,
        Double confidenceScore,
        StorageLocationsDto storageLocations,
        Instant createdAt,
        Instant updatedAt) {
}
