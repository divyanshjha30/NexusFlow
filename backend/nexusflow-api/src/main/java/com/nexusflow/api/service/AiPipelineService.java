package com.nexusflow.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusflow.ai.service.DocumentAnalysisService;
import com.nexusflow.ai.service.OllamaClient;
import com.nexusflow.ai.service.TextExtractionService;
import com.nexusflow.api.repository.DocumentRepository;
import com.nexusflow.api.repository.EmbeddingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Extract → analyse → embed → index. Runs after replication completes. */
@Service
public class AiPipelineService {

    private static final Logger log = LoggerFactory.getLogger(AiPipelineService.class);

    private static final int CHUNK_CHARS = 1200;
    private static final int CHUNK_OVERLAP = 150;
    private static final int MAX_CHUNKS = 24;

    private final TextExtractionService extraction;
    private final DocumentAnalysisService analysis;
    private final OllamaClient ollama;
    private final DocumentRepository documents;
    private final EmbeddingRepository embeddings;
    private final ObjectMapper mapper;
    private final ProgressPublisher progress;

    public AiPipelineService(
            TextExtractionService extraction,
            DocumentAnalysisService analysis,
            OllamaClient ollama,
            DocumentRepository documents,
            EmbeddingRepository embeddings,
            ObjectMapper mapper,
            ProgressPublisher progress) {
        this.extraction = extraction;
        this.analysis = analysis;
        this.ollama = ollama;
        this.documents = documents;
        this.embeddings = embeddings;
        this.mapper = mapper;
        this.progress = progress;
    }

    public record Outcome(String documentType, int chunksEmbedded) {}

    public Outcome run(UUID documentId, UUID userId, String fileName, byte[] bytes) {
        long t0 = System.currentTimeMillis();
        progress.publish(documentId, userId, "AI_STARTED", 88, "Extracting text", null, null);
        String text = extraction.extract(bytes, fileName);
        long extractMs = System.currentTimeMillis() - t0;

        long t1 = System.currentTimeMillis();
        DocumentAnalysisService.Analysis result = analysis.analyse(text);
        long analyseMs = System.currentTimeMillis() - t1;

        progress.publish(documentId, userId, "AI_CLASSIFIED", 91,
                "Classified as " + result.documentType(), "GCP", (int) extractMs);
        progress.publish(documentId, userId, "AI_SUMMARISED", 95,
                "Summary generated", "AWS", (int) analyseMs);
        progress.publish(documentId, userId, "AI_ENTITIES", 97,
                "%d entity groups extracted".formatted(result.entities().size()), "AWS", null);

        try {
            documents.saveAiResult(documentId, new DocumentRepository.AiResult(
                    result.documentType(),
                    result.summary(),
                    result.tags(),
                    mapper.writeValueAsString(result.entities()),
                    result.sentiment(),
                    result.confidence(),
                    text));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise extracted entities", e);
        }

        long t2 = System.currentTimeMillis();
        int chunks = indexEmbeddings(documentId, userId, text);
        progress.publish(documentId, userId, "AI_EMBEDDED", 99,
                "%d chunks embedded".formatted(chunks), null, (int) (System.currentTimeMillis() - t2));

        progress.publish(documentId, userId, "AI_COMPLETE", 100, "Analysis complete", null,
                (int) (System.currentTimeMillis() - t0));

        return new Outcome(result.documentType(), chunks);
    }

    private int indexEmbeddings(UUID documentId, UUID userId, String text) {
        if (text == null || text.isBlank()) return 0;

        embeddings.deleteFor(documentId);
        List<String> chunks = chunk(text);
        int stored = 0;

        for (int i = 0; i < chunks.size(); i++) {
            List<Float> vector = ollama.embed(chunks.get(i));
            if (vector.isEmpty()) {
                log.warn("Empty embedding for {} chunk {}", documentId, i);
                continue;
            }
            embeddings.save(documentId, userId, i, chunks.get(i), vector);
            stored++;
        }
        return stored;
    }

    static List<String> chunk(String text) {
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < text.length() && chunks.size() < MAX_CHUNKS) {
            int end = Math.min(text.length(), start + CHUNK_CHARS);
            chunks.add(text.substring(start, end));
            if (end == text.length()) break;
            start = end - CHUNK_OVERLAP;
        }
        return chunks;
    }
}
