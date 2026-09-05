package com.nexusflow.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.function.Consumer;

/** Talks to Ollama's /api/generate endpoint and relays tokens as they arrive. */
@Service
public class OllamaChatService {

    private static final Logger log = LoggerFactory.getLogger(OllamaChatService.class);

    private static final String SYSTEM_PROMPT = """
            You are NexusFlow Assistant, an AI that helps users understand their documents.
            Answer concisely and factually. If you do not know, say so plainly.
            """;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper mapper;
    private final String baseUrl;
    private final String model;

    public OllamaChatService(
            ObjectMapper mapper,
            @Value("${nexusflow.ollama.base-url}") String baseUrl,
            @Value("${nexusflow.ollama.model}") String model) {
        this.mapper = mapper;
        this.baseUrl = baseUrl;
        this.model = model;
    }

    public void streamAnswer(String question, String context, Consumer<String> onToken) {
        String prompt = context == null || context.isBlank()
                ? SYSTEM_PROMPT + "\n\nQuestion: " + question
                : SYSTEM_PROMPT + "\n\nDocuments:\n" + context + "\n\nQuestion: " + question;

        try {
            String body = mapper.writeValueAsString(Map.of(
                    "model", model,
                    "prompt", prompt,
                    "stream", true));

            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/api/generate"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofMinutes(2))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<java.io.InputStream> response =
                    http.send(request, HttpResponse.BodyHandlers.ofInputStream());

            if (response.statusCode() >= 400) {
                onToken.accept("The local model returned HTTP " + response.statusCode() + ".");
                return;
            }

            try (BufferedReader reader = new BufferedReader(
                    new java.io.InputStreamReader(response.body()))) {
                String line;
                boolean finished = false;
                while (!finished && (line = reader.readLine()) != null) {
                    if (!line.isBlank()) {
                        JsonNode node = mapper.readTree(line);
                        String chunk = node.path("response").asText("");
                        if (!chunk.isEmpty()) onToken.accept(chunk);
                        finished = node.path("done").asBoolean(false);
                    }
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Ollama call interrupted", e);
            onToken.accept("Generation was interrupted.");
        } catch (Exception e) {
            log.warn("Ollama call failed ({}): {}", e.getClass().getSimpleName(), e.getMessage(), e);
            onToken.accept("The AI service is unreachable (" + e.getMessage() + ").");
        }
    }
}
