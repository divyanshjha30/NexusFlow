package com.nexusflow.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Runs the local LLM over extracted text to derive structured metadata. */
@Service
public class DocumentAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(DocumentAnalysisService.class);

    private static final String TYPE_OTHER = "OTHER";
    private static final String SENTIMENT_NEUTRAL = "NEUTRAL";

    private static final Set<String> TYPES =
            Set.of("INVOICE", "CONTRACT", "REPORT", "RECEIPT", "IMAGE", "AUDIO", TYPE_OTHER);

    private static final int CLASSIFY_CHARS = 1200;
    private static final int SUMMARY_CHARS = 6000;
    private static final int ENTITY_CHARS = 4000;

    private final OllamaClient ollama;
    private final ObjectMapper mapper;

    public DocumentAnalysisService(OllamaClient ollama, ObjectMapper mapper) {
        this.ollama = ollama;
        this.mapper = mapper;
    }

    public record Analysis(
            String documentType,
            String summary,
            Map<String, List<String>> entities,
            List<String> tags,
            String sentiment,
            Double confidence
    ) {}

    public Analysis analyse(String text) {
        if (text == null || text.isBlank()) {
            return new Analysis(TYPE_OTHER, null, Map.of(), List.of(), SENTIMENT_NEUTRAL, null);
        }

        String type = classify(text);
        String summary = summarise(text);
        Map<String, List<String>> entities = extractEntities(text);
        String sentiment = detectSentiment(text);
        List<String> tags = buildTags(type, entities, text);

        return new Analysis(type, summary, entities, tags, sentiment, 0.9);
    }

    private String classify(String text) {
        String prompt = """
                Classify the document into exactly one category:
                INVOICE, CONTRACT, REPORT, RECEIPT, IMAGE, AUDIO, OTHER

                Reply with the category word only, nothing else.

                Document:
                %s
                """.formatted(truncate(text, CLASSIFY_CHARS));

        String raw = ollama.generate(prompt).toUpperCase(Locale.ROOT).replaceAll("[^A-Z]", "");
        return TYPES.stream().filter(raw::contains).findFirst().orElse(TYPE_OTHER);
    }

    private String summarise(String text) {
        String prompt = """
                Summarise the following document in exactly three sentences.
                Be factual. Include key parties, dates and amounts. Do not add information
                that is not present. Reply with the summary only.

                Document:
                %s
                """.formatted(truncate(text, SUMMARY_CHARS));

        String summary = ollama.generate(prompt);
        return summary.isBlank() ? null : summary;
    }

    private Map<String, List<String>> extractEntities(String text) {
        String prompt = """
                Extract named entities from the document and reply with JSON only,
                no markdown fence and no commentary, using exactly this shape:
                {"organizations":[],"persons":[],"dates":[],"amounts":[],"locations":[]}

                Document:
                %s
                """.formatted(truncate(text, ENTITY_CHARS));

        String raw = ollama.generate(prompt);
        String json = isolateJson(raw);
        if (json == null) return Map.of();

        try {
            JsonNode node = mapper.readTree(json);
            Map<String, List<String>> out = new LinkedHashMap<>();
            for (String key : List.of("organizations", "persons", "dates", "amounts", "locations")) {
                List<String> values = new ArrayList<>();
                node.path(key).forEach(v -> {
                    String s = v.asText("").strip();
                    if (!s.isEmpty()) values.add(s);
                });
                if (!values.isEmpty()) out.put(key, values);
            }
            return out;
        } catch (Exception e) {
            log.debug("Entity JSON unparseable: {}", e.getMessage());
            return Map.of();
        }
    }

    private String detectSentiment(String text) {
        String prompt = """
                Classify the overall tone of this document as exactly one of:
                POSITIVE, NEGATIVE, NEUTRAL, MIXED. Reply with the word only.

                Document:
                %s
                """.formatted(truncate(text, CLASSIFY_CHARS));

        String raw = ollama.generate(prompt).toUpperCase(Locale.ROOT);
        for (String s : List.of("POSITIVE", "NEGATIVE", "MIXED", SENTIMENT_NEUTRAL)) {
            if (raw.contains(s)) return s;
        }
        return SENTIMENT_NEUTRAL;
    }

    /** Tags are derived deterministically so they stay stable across re-runs. */
    private List<String> buildTags(String type, Map<String, List<String>> entities, String text) {
        Set<String> tags = new LinkedHashSet<>();
        tags.add(type.toLowerCase(Locale.ROOT));

        entities.getOrDefault("organizations", List.of()).stream()
                .limit(3)
                .map(o -> o.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-)|(-$)", ""))
                .filter(s -> !s.isBlank())
                .forEach(tags::add);

        var yearMatcher = java.util.regex.Pattern.compile("\\b(19|20)\\d{2}\\b").matcher(text);
        if (yearMatcher.find()) tags.add(yearMatcher.group());

        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("overdue")) tags.add("overdue");
        else if (lower.contains("paid") || lower.contains("payment received")) tags.add("paid");

        return List.copyOf(tags);
    }

    /** Models often wrap JSON in prose or a fence; pull out the object. */
    private static String isolateJson(String raw) {
        if (raw == null) return null;
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        return (start >= 0 && end > start) ? raw.substring(start, end + 1) : null;
    }

    private static String truncate(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max);
    }
}
