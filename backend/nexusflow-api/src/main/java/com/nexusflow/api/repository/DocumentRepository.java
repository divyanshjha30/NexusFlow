package com.nexusflow.api.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusflow.common.dto.DocumentDto;
import com.nexusflow.common.dto.StorageLocationsDto;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class DocumentRepository {

    private static final String STATUS = "status";
    private static final String SELECT = "SELECT ";

    private static final String SELECT_COLUMNS = """
            id, user_id, file_name, original_name, mime_type, file_size_bytes,
            document_type, status, s3_key, azure_blob_name, gcs_object_name, oci_object_name,
            summary, ai_tags, entities, sentiment, confidence_score, extracted_text,
            is_archived, created_at, updated_at
            """;

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;

    public DocumentRepository(DataSource dataSource, ObjectMapper mapper) {
        this.jdbc = JdbcClient.create(dataSource);
        this.mapper = mapper;
    }

    public record Filter(
            UUID userId,
            String search,
            String type,
            String status,
            boolean archived,
            String sort,
            String direction,
            int page,
            int size
    ) {}

    public List<DocumentDto> find(Filter f) {
        StringBuilder sql = new StringBuilder(SELECT + SELECT_COLUMNS + " FROM documents WHERE deleted_at IS NULL");
        Map<String, Object> params = new LinkedHashMap<>();
        appendFilters(sql, params, f);

        sql.append(" ORDER BY ").append(sortColumn(f.sort()))
           .append("desc".equalsIgnoreCase(f.direction()) ? " DESC" : " ASC")
           .append(" LIMIT :limit OFFSET :offset");
        params.put("limit", f.size());
        params.put("offset", (long) f.page() * f.size());

        var spec = jdbc.sql(sql.toString());
        for (var e : params.entrySet()) spec = spec.param(e.getKey(), e.getValue());
        return spec.query(this::mapRow).list();
    }

    public long count(Filter f) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL");
        Map<String, Object> params = new LinkedHashMap<>();
        appendFilters(sql, params, f);

        var spec = jdbc.sql(sql.toString());
        for (var e : params.entrySet()) spec = spec.param(e.getKey(), e.getValue());
        return spec.query(Long.class).single();
    }

    public Optional<DocumentDto> findById(UUID id) {
        return jdbc.sql(SELECT + SELECT_COLUMNS + " FROM documents WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .query(this::mapRow)
                .optional();
    }

    public record NewDocument(
            UUID id,
            UUID userId,
            String fileName,
            String originalName,
            String mimeType,
            long size,
            String status,
            String s3Key
    ) {}

    public void insert(NewDocument doc) {
        jdbc.sql("""
                INSERT INTO documents
                    (id, user_id, file_name, original_name, mime_type, file_size_bytes, status, s3_key)
                VALUES
                    (:id, :userId, :fileName, :originalName, :mimeType, :size, :status, :s3Key)
                """)
                .param("id", doc.id())
                .param("userId", doc.userId())
                .param("fileName", doc.fileName())
                .param("originalName", doc.originalName())
                .param("mimeType", doc.mimeType())
                .param("size", doc.size())
                .param(STATUS, doc.status())
                .param("s3Key", doc.s3Key())
                .update();
    }

    public void markStored(UUID id, String column, String value) {
        // Column name is caller-controlled from a fixed set, never user input.
        jdbc.sql("UPDATE documents SET " + column + " = :value, updated_at = NOW() WHERE id = :id")
                .param("value", value)
                .param("id", id)
                .update();
    }

    public void updateStatus(UUID id, String status) {
        jdbc.sql("UPDATE documents SET status = :status, updated_at = NOW() WHERE id = :id")
                .param(STATUS, status)
                .param("id", id)
                .update();
    }

    public record AiResult(
            String documentType,
            String summary,
            List<String> tags,
            String entitiesJson,
            String sentiment,
            Double confidence,
            String extractedText
    ) {}

    public void saveAiResult(UUID id, AiResult result) {
        jdbc.sql("""
                UPDATE documents SET
                    document_type    = :type,
                    summary          = :summary,
                    ai_tags          = :tags,
                    entities         = CAST(:entities AS JSONB),
                    sentiment        = :sentiment,
                    confidence_score = :confidence,
                    extracted_text   = :text,
                    classification   = :type,
                    status           = 'READY',
                    updated_at       = NOW()
                WHERE id = :id
                """)
                .param("type", result.documentType())
                .param("summary", result.summary())
                .param("tags", result.tags().toArray(String[]::new))
                .param("entities", result.entitiesJson())
                .param("sentiment", result.sentiment())
                .param("confidence", result.confidence())
                .param("text", result.extractedText())
                .param("id", id)
                .update();
    }

    public void softDelete(UUID id) {
        jdbc.sql("UPDATE documents SET deleted_at = NOW(), updated_at = NOW() WHERE id = :id")
                .param("id", id)
                .update();
    }

    public void setArchived(UUID id, boolean archived) {
        jdbc.sql("""
                UPDATE documents SET
                    is_archived = :archived,
                    archived_at = CASE WHEN :archived THEN NOW() ELSE NULL END,
                    status      = CASE WHEN :archived THEN 'ARCHIVED' ELSE 'READY' END,
                    updated_at  = NOW()
                WHERE id = :id
                """)
                .param("archived", archived)
                .param("id", id)
                .update();
    }

    /** Keyword half of hybrid search. */
    public List<DocumentDto> keywordSearch(UUID userId, String query, int limit) {
        return jdbc.sql(SELECT + SELECT_COLUMNS + """
                 FROM documents
                 WHERE deleted_at IS NULL AND user_id = :user
                   AND (file_name ILIKE :q
                        OR COALESCE(summary, '') ILIKE :q
                        OR COALESCE(extracted_text, '') ILIKE :q)
                 ORDER BY created_at DESC
                 LIMIT :limit
                """)
                .param("user", userId)
                .param("q", "%" + query.strip() + "%")
                .param("limit", limit)
                .query(this::mapRow)
                .list();
    }

    public long totalBytesForUser(UUID userId) {
        return jdbc.sql("SELECT COALESCE(SUM(file_size_bytes), 0) FROM documents WHERE user_id = :u AND deleted_at IS NULL")
                .param("u", userId)
                .query(Long.class)
                .single();
    }

    private void appendFilters(StringBuilder sql, Map<String, Object> params, Filter f) {
        if (f.userId() != null) {
            sql.append(" AND user_id = :userId");
            params.put("userId", f.userId());
        }
        sql.append(f.archived() ? " AND status = 'ARCHIVED'" : " AND status <> 'ARCHIVED'");

        if (hasText(f.type())) {
            sql.append(" AND document_type = :type");
            params.put("type", f.type());
        }
        if (hasText(f.status())) {
            sql.append(" AND status = :status");
            params.put(STATUS, f.status());
        }
        if (hasText(f.search())) {
            sql.append(" AND (file_name ILIKE :q OR COALESCE(summary, '') ILIKE :q)");
            params.put("q", "%" + f.search().trim() + "%");
        }
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private static String sortColumn(String sort) {
        return switch (sort == null ? "" : sort) {
            case "fileName" -> "file_name ";
            case "fileSize" -> "file_size_bytes ";
            default -> "created_at ";
        };
    }

    private DocumentDto mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new DocumentDto(
                rs.getObject("id", UUID.class),
                rs.getString("file_name"),
                rs.getString("mime_type"),
                rs.getLong("file_size_bytes"),
                rs.getString("document_type"),
                rs.getString(STATUS),
                rs.getString("summary"),
                readArray(rs.getArray("ai_tags")),
                readEntities(rs.getString("entities")),
                rs.getString("sentiment"),
                toDouble(rs.getBigDecimal("confidence_score")),
                new StorageLocationsDto(
                        rs.getString("s3_key"),
                        rs.getString("azure_blob_name"),
                        rs.getString("gcs_object_name"),
                        rs.getString("oci_object_name"),
                        rs.getBoolean("is_archived")),
                rs.getString("extracted_text"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("updated_at")));
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    /** confidence_score is DECIMAL, so JDBC hands back BigDecimal. */
    private static Double toDouble(java.math.BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }

    private static List<String> readArray(Array array) throws SQLException {
        if (array == null) return List.of();
        Object raw = array.getArray();
        if (raw instanceof Object[] values) {
            List<String> out = new ArrayList<>(values.length);
            for (Object v : values) if (v != null) out.add(v.toString());
            return out;
        }
        return List.of();
    }

    private Map<String, List<String>> readEntities(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return mapper.readValue(json, new TypeReference<Map<String, List<String>>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
