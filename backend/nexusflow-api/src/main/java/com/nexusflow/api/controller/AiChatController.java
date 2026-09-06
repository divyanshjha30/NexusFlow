package com.nexusflow.api.controller;

import com.nexusflow.ai.service.OllamaChatService;
import com.nexusflow.api.service.CurrentUserService;
import com.nexusflow.api.service.SearchService;
import com.nexusflow.common.dto.ChatRequestDto;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ai")
public class AiChatController {

    private static final int MAX_CONTEXT_CHARS = 6000;

    private final OllamaChatService ollama;
    private final SearchService search;
    private final CurrentUserService users;

    public AiChatController(OllamaChatService ollama, SearchService search, CurrentUserService users) {
        this.ollama = ollama;
        this.search = search;
        this.users = users;
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_PLAIN_VALUE)
    public StreamingResponseBody stream(@RequestBody ChatRequestDto request) {
        String context = search.buildContext(
                users.currentUserId(), request.message(), request.documentIds(), MAX_CONTEXT_CHARS);

        return outputStream -> ollama.streamAnswer(request.message(), context, token -> {
            try {
                outputStream.write(token.getBytes(StandardCharsets.UTF_8));
                outputStream.flush();
            } catch (Exception e) {
                throw new IllegalStateException("Client disconnected", e);
            }
        });
    }

    public record Source(String documentId, String fileName, String excerpt, double relevanceScore) {}

    /** The same retrieval that grounded the answer, so citations are truthful. */
    @PostMapping("/chat/sources")
    public List<Source> sources(@RequestBody ChatRequestDto request) {
        return search.sourcesFor(users.currentUserId(), request.message(), request.documentIds())
                .stream()
                .map(hit -> new Source(
                        hit.document().id().toString(),
                        hit.document().fileName(),
                        excerpt(hit.excerpt()),
                        hit.score()))
                .toList();
    }

    private static String excerpt(String text) {
        if (text == null) return "";
        String flat = text.replaceAll("\\s+", " ").strip();
        return flat.length() <= 180 ? flat : flat.substring(0, 180) + "…";
    }
}
