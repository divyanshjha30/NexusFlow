package com.nexusflow.api.controller;

import com.nexusflow.api.repository.EventRepository;
import com.nexusflow.api.service.CurrentUserService;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class StatsController {

    private final JdbcClient jdbc;
    private final EventRepository events;
    private final CurrentUserService users;

    public StatsController(DataSource dataSource, EventRepository events, CurrentUserService users) {
        this.jdbc = JdbcClient.create(dataSource);
        this.events = events;
        this.users = users;
    }

    public record CloudUsage(long objects, long bytes) {}

    public record DailyCount(String date, long count) {}

    public record Stats(
            long documentCount,
            long totalBytes,
            long replicaCount,
            long analysedCount,
            Map<String, CloudUsage> perCloud,
            List<DailyCount> uploadsByDay
    ) {}

    @GetMapping("/stats")
    public Stats stats() {
        UUID userId = users.currentUserId();

        record Totals(long count, long bytes, long analysed) {}
        Totals totals = jdbc.sql("""
                SELECT COUNT(*) AS c,
                       COALESCE(SUM(file_size_bytes), 0) AS b,
                       COUNT(summary) AS a
                FROM documents WHERE user_id = :u AND deleted_at IS NULL
                """)
                .param("u", userId)
                .query((rs, n) -> new Totals(rs.getLong("c"), rs.getLong("b"), rs.getLong("a")))
                .single();

        Map<String, CloudUsage> perCloud = new LinkedHashMap<>();
        long replicas = 0;
        for (var entry : Map.of(
                "AWS", "s3_key",
                "AZURE", "azure_blob_name",
                "GCP", "gcs_object_name",
                "OCI", "oci_object_name").entrySet()) {

            CloudUsage usage = jdbc.sql("""
                    SELECT COUNT(*) AS c, COALESCE(SUM(file_size_bytes), 0) AS b
                    FROM documents
                    WHERE user_id = :u AND deleted_at IS NULL AND %s IS NOT NULL
                    """.formatted(entry.getValue()))
                    .param("u", userId)
                    .query((rs, n) -> new CloudUsage(rs.getLong("c"), rs.getLong("b")))
                    .single();
            perCloud.put(entry.getKey(), usage);
            replicas += usage.objects();
        }

        List<DailyCount> byDay = jdbc.sql("""
                SELECT DATE(created_at) AS d, COUNT(*) AS c
                FROM documents
                WHERE user_id = :u AND deleted_at IS NULL
                  AND created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY d
                """)
                .param("u", userId)
                .query((rs, n) -> new DailyCount(rs.getString("d"), rs.getLong("c")))
                .list();

        return new Stats(totals.count(), totals.bytes(), replicas, totals.analysed(),
                perCloud, fillMissingDays(byDay));
    }

    @GetMapping("/tags")
    public List<String> tags() {
        return jdbc.sql("""
                SELECT DISTINCT tag FROM documents, UNNEST(ai_tags) AS tag
                WHERE user_id = :u AND deleted_at IS NULL
                ORDER BY tag
                LIMIT 24
                """)
                .param("u", users.currentUserId())
                .query(String.class)
                .list();
    }

    @GetMapping("/documents/{id}/events")
    public List<EventRepository.Event> documentEvents(@PathVariable UUID id) {
        return events.findByDocument(id);
    }

    @GetMapping("/events")
    public List<EventRepository.Event> recentEvents(@RequestParam(defaultValue = "50") int limit) {
        return events.recent(users.currentUserId(), Math.min(limit, 200));
    }

    /** Sparklines need a point per day, including days with no uploads. */
    private static List<DailyCount> fillMissingDays(List<DailyCount> raw) {
        Map<String, Long> byDate = new LinkedHashMap<>();
        raw.forEach(d -> byDate.put(d.date(), d.count()));

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<DailyCount> filled = new ArrayList<>(7);
        for (int i = 6; i >= 0; i--) {
            String date = today.minusDays(i).toString();
            filled.add(new DailyCount(date, byDate.getOrDefault(date, 0L)));
        }
        return filled;
    }
}
