package com.nexusflow.common.dto;

import java.util.List;

/** Mirrors the shape the frontend expects for paginated results. */
public record PageDto<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {
    public static <T> PageDto<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size <= 0 ? 1 : (int) Math.max(1, Math.ceil((double) totalElements / size));
        return new PageDto<>(content, page, size, totalElements, totalPages);
    }
}
