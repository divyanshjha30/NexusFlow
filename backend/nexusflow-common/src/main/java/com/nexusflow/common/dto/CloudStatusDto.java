package com.nexusflow.common.dto;

import java.util.Map;

public record CloudStatusDto(
        String status,
        String endpoint,
        Map<String, String> services,
        long latencyMs,
        long objectCount) {
}
