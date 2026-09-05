package com.nexusflow.common.dto;

import java.util.UUID;

public record UserProfileDto(
        UUID id,
        String email,
        String displayName,
        String role,
        long storageUsedBytes,
        long storageLimitBytes,
        long documentCount) {
}
