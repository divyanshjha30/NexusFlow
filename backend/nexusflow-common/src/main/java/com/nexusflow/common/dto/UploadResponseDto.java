package com.nexusflow.common.dto;

import java.util.UUID;

public record UploadResponseDto(
        UUID documentId,
        String status,
        String websocketTopic,
        String message) {
}
