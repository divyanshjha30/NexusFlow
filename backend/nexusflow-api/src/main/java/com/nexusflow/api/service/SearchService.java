package com.nexusflow.api.service;

import com.nexusflow.ai.service.OllamaClient;
import com.nexusflow.api.repository.DocumentRepository;
import com.nexusflow.api.repository.EmbeddingRepository;
import com.nexusflow.common.dto.DocumentDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Hybrid retrieval: vector similarity merged with keyword matches. */
@Service
public class SearchService {

    private static final int VECTOR_LIMIT = 12;
    private static final int KEYWORD_LIMIT = 20;
    private static final double MIN_SIMILARITY = 0.25;

    private final OllamaClient ollama;
    private final EmbeddingRepository embeddings;
    private final DocumentRepository documents;

    public SearchService(OllamaClient ollama, EmbeddingRepository embeddings, DocumentRepository documents) {
        this.ollama = ollama;
        this.embeddings = embeddings;
        this.documents = documents;
    }

    public record Hit(DocumentDto document, double score, String excerpt, List<String> matchedFields) {}

    public List<Hit> search(UUID userId, String query, int limit) {
        if (query == null || query.isBlank()) return List.of();

        Map<UUID, Hit> merged = new LinkedHashMap<>();

        for (var match : embeddings.search(userId, ollama.embed(query), VECTOR_LIMIT)) {
            if (match.similarity() < MIN_SIMILARITY) continue;
            documents.findById(match.documentId()).ifPresent(doc ->
                    merged.merge(
                            doc.id(),
                            new Hit(doc, match.similarity(), match.chunkText(), List.of("content")),
                            (a, b) -> a.score() >= b.score() ? a : b));
        }

        for (DocumentDto doc : documents.keywordSearch(userId, query, KEYWORD_LIMIT)) {
            Hit existing = merged.get(doc.id());
            if (existing == null) {
                merged.put(doc.id(), new Hit(doc, 0.5, doc.summary(), List.of("fileName", "summary")));
            } else {
                // Present in both halves — boost, capped at 1.
                List<String> fields = new ArrayList<>(existing.matchedFields());
                fields.add("fileName");
                merged.put(doc.id(), new Hit(doc, Math.min(1.0, existing.score() + 0.15),
                        existing.excerpt(), List.copyOf(fields)));
            }
        }

        return merged.values().stream()
                .sorted((a, b) -> Double.compare(b.score(), a.score()))
                .limit(limit)
                .toList();
    }

    /** Builds grounded context for RAG chat. */
    public String buildContext(UUID userId, String question, List<String> documentIds, int maxChars) {
        List<Hit> hits = documentIds == null || documentIds.isEmpty()
                ? search(userId, question, 6)
                : documentIds.stream()
                    .map(id -> {
                        try {
                            return documents.findById(UUID.fromString(id)).orElse(null);
                        } catch (IllegalArgumentException e) {
                            return null;
                        }
                    })
                    .filter(java.util.Objects::nonNull)
                    .map(doc -> new Hit(doc, 1.0, doc.summary(), List.of()))
                    .toList();

        StringBuilder sb = new StringBuilder();
        for (Hit hit : hits) {
            String body = hit.excerpt() != null ? hit.excerpt() : hit.document().summary();
            if (body != null && !body.isBlank()) {
                String block = "### %s%n%s%n%n".formatted(hit.document().fileName(), body);
                if (sb.length() + block.length() > maxChars) break;
                sb.append(block);
            }
        }
        return sb.toString();
    }

    public List<Hit> sourcesFor(UUID userId, String question, List<String> documentIds) {
        if (documentIds != null && !documentIds.isEmpty()) {
            return documentIds.stream()
                    .map(id -> {
                        try {
                            return documents.findById(UUID.fromString(id)).orElse(null);
                        } catch (IllegalArgumentException e) {
                            return null;
                        }
                    })
                    .filter(java.util.Objects::nonNull)
                    .map(doc -> new Hit(doc, 1.0, doc.summary(), List.of()))
                    .toList();
        }
        return search(userId, question, 4);
    }
}
