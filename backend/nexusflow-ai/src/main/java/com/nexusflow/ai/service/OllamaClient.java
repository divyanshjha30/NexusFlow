package com.nexusflow.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Thin client over the Ollama HTTP API for one-shot generation and embeddings. */
@Service
public class OllamaClient {

    private static final Logger log = LoggerFactory.getLogger(OllamaClient.class);
    private static final Duration TIMEOUT = Duration.ofMinutes(3);

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper mapper;
    private final String baseUrl;
    private final String chatModel;
    private final String embedModel;

    public OllamaClient(
            ObjectMapper mapper,
            @Value("${nexusflow.ollama.base-url}") String baseUrl,
            @Value("${nexusflow.ollama.model}") String chatModel,
            @Value("${nexusflow.ollama.embed-model}") String embedModel) {
        this.mapper = mapper;
        this.baseUrl = baseUrl;
        this.chatModel = chatModel;
        this.embedModel = embedModel;
    }

    public String generate(String prompt) {
        try {
            String body = mapper.writeValueAsString(Map.of(
                    "model", chatModel,
                    "prompt", prompt,
                    "stream", false,
                    "options", Map.of("temperature", 0.1)));

            HttpResponse<String> response = http.send(
                    HttpRequest.newBuilder(URI.create(baseUrl + "/api/generate"))
                            .header("Content-Type", "application/json")
                            .timeout(TIMEOUT)
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 300) {
                log.warn("Ollama generate returned {}", response.statusCode());
                return "";
            }
            return mapper.readTree(response.body()).path("response").asText("").strip();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return "";
        } catch (Exception e) {
            log.warn("Ollama generate failed: {}", e.getMessage());
            return "";
        }
    }

    public List<Float> embed(String text) {
        try {
            String body = mapper.writeValueAsString(Map.of(
                    "model", embedModel,
                    "prompt", text));

            HttpResponse<String> response = http.send(
                    HttpRequest.newBuilder(URI.create(baseUrl + "/api/embeddings"))
                            .header("Content-Type", "application/json")
                            .timeout(TIMEOUT)
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 300) return List.of();

            JsonNode vector = mapper.readTree(response.body()).path("embedding");
            List<Float> out = new ArrayList<>(vector.size());
            vector.forEach(n -> out.add((float) n.asDouble()));
            return out;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return List.of();
        } catch (Exception e) {
            log.warn("Ollama embed failed: {}", e.getMessage());
            return List.of();
        }
    }
}
