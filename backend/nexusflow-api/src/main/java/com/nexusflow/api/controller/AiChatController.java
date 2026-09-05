package com.nexusflow.api.controller;

import com.nexusflow.ai.service.OllamaChatService;
import com.nexusflow.api.service.DocumentService;
import com.nexusflow.common.dto.ChatRequestDto;
import com.nexusflow.common.dto.DocumentDto;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ai")
public class AiChatController {

    private static final int MAX_CONTEXT_CHARS = 6000;

    private final OllamaChatService ollama;
    private final DocumentService documents;

    public AiChatController(OllamaChatService ollama, DocumentService documents) {
        this.ollama = ollama;
        this.documents = documents;
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_PLAIN_VALUE)
    public StreamingResponseBody stream(@RequestBody ChatRequestDto request) {
        String context = buildContext(request.documentIds());

        return outputStream -> ollama.streamAnswer(request.message(), context, token -> {
            try {
                outputStream.write(token.getBytes(StandardCharsets.UTF_8));
                outputStream.flush();
            } catch (Exception e) {
                throw new IllegalStateException("Client disconnected", e);
            }
        });
    }

    private String buildContext(List<String> documentIds) {
        if (documentIds == null || documentIds.isEmpty()) return "";

        String context = documentIds.stream()
                .map(this::safeGet)
                .filter(java.util.Objects::nonNull)
                .map(doc -> "### %s\n%s".formatted(
                        doc.fileName(),
                        doc.summary() != null ? doc.summary() : doc.extractedText()))
                .collect(Collectors.joining("\n\n"));

        return context.length() > MAX_CONTEXT_CHARS
                ? context.substring(0, MAX_CONTEXT_CHARS)
                : context;
    }

    private DocumentDto safeGet(String id) {
        try {
            return documents.get(UUID.fromString(id));
        } catch (Exception e) {
            return null;
        }
    }
}
