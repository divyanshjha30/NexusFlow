package com.nexusflow.api.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class EventRepository {

    private final JdbcClient jdbc;

    public EventRepository(DataSource dataSource) {
        this.jdbc = JdbcClient.create(dataSource);
    }

    public record Event(
            UUID documentId,
            String eventType,
            String message,
            String cloudProvider,
            Integer durationMs,
            Instant createdAt
    ) {}

    public void log(UUID documentId, UUID userId, String eventType, String message,
                    String cloudProvider, Integer durationMs) {
        jdbc.sql("""
                INSERT INTO document_events
                    (document_id, user_id, event_type, event_data, cloud_provider, duration_ms)
                VALUES
                    (:doc, :user, :type, CAST(:data AS JSONB), :cloud, :duration)
                """)
                .param("doc", documentId)
                .param("user", userId)
                .param("type", eventType)
                .param("data", "{\"message\":" + quote(message) + "}")
                .param("cloud", cloudProvider)
                .param("duration", durationMs)
                .update();
    }

    public List<Event> findByDocument(UUID documentId) {
        return jdbc.sql("""
                SELECT document_id, event_type, event_data->>'message' AS message,
                       cloud_provider, duration_ms, created_at
                FROM document_events
                WHERE document_id = :doc
                ORDER BY created_at ASC
                """)
                .param("doc", documentId)
                .query((rs, n) -> new Event(
                        rs.getObject("document_id", UUID.class),
                        rs.getString("event_type"),
                        rs.getString("message"),
                        rs.getString("cloud_provider"),
                        toInteger(rs.getObject("duration_ms")),
                        toInstant(rs.getTimestamp("created_at"))))
                .list();
    }

    public List<Event> recent(UUID userId, int limit) {
        return jdbc.sql("""
                SELECT document_id, event_type, event_data->>'message' AS message,
                       cloud_provider, duration_ms, created_at
                FROM document_events
                WHERE user_id = :user
                ORDER BY created_at DESC
                LIMIT :limit
                """)
                .param("user", userId)
                .param("limit", limit)
                .query((rs, n) -> new Event(
                        rs.getObject("document_id", UUID.class),
                        rs.getString("event_type"),
                        rs.getString("message"),
                        rs.getString("cloud_provider"),
                        toInteger(rs.getObject("duration_ms")),
                        toInstant(rs.getTimestamp("created_at"))))
                .list();
    }

    /** CockroachDB INTEGER is INT8, so JDBC hands back Long. */
    private static Integer toInteger(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    private static String quote(String value) {
        if (value == null) return "null";
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
