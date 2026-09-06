package com.nexusflow.api.controller;

import com.nexusflow.api.service.CurrentUserService;
import com.nexusflow.api.service.SearchService;
import com.nexusflow.common.dto.DocumentDto;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    private static final int DEFAULT_LIMIT = 20;

    private final SearchService search;
    private final CurrentUserService users;

    public SearchController(SearchService search, CurrentUserService users) {
        this.search = search;
        this.users = users;
    }

    public record SearchRequest(String query, Integer size) {}

    public record SearchResult(
            DocumentDto document,
            double score,
            String excerpt,
            List<String> matchedFields) {}

    public record SearchResponse(
            String query,
            List<SearchResult> results,
            int totalResults,
            long searchTimeMs,
            String searchStrategy) {}

    @PostMapping
    public SearchResponse search(@RequestBody SearchRequest request) {
        long start = System.currentTimeMillis();
        int limit = request.size() == null ? DEFAULT_LIMIT : request.size();

        List<SearchResult> results = search
                .search(users.currentUserId(), request.query(), limit)
                .stream()
                .map(h -> new SearchResult(h.document(), h.score(), h.excerpt(), h.matchedFields()))
                .toList();

        return new SearchResponse(
                request.query(),
                results,
                results.size(),
                System.currentTimeMillis() - start,
                "HYBRID");
    }
}
