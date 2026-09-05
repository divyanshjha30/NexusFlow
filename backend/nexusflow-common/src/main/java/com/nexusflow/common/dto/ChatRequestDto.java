package com.nexusflow.common.dto;

import java.util.List;

public record ChatRequestDto(
        String message,
        String conversationId,
        List<String> documentIds) {
}
