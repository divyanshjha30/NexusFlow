package com.nexusflow.api.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.util.List;
import java.util.StringJoiner;
import java.util.UUID;

@Repository
public class EmbeddingRepository {

    private final JdbcClient jdbc;

    public EmbeddingRepository(DataSource dataSource) {
        this.jdbc = JdbcClient.create(dataSource);
    }

    public record Match(UUID documentId, String chunkText, double similarity) {}

    public void deleteFor(UUID documentId) {
        jdbc.sql("DELETE FROM document_embeddings WHERE document_id = :id")
                .param("id", documentId)
                .update();
    }

    public void save(UUID documentId, UUID userId, int index, String chunk, List<Float> vector) {
        jdbc.sql("""
                INSERT INTO document_embeddings (document_id, user_id, chunk_index, chunk_text, embedding)
                VALUES (:doc, :user, :idx, :text, :vec)
                """)
                .param("doc", documentId)
                .param("user", userId)
                .param("idx", index)
                .param("text", chunk)
                .param("vec", toVectorLiteral(vector))
                .update();
    }

    /** Cosine distance via pgvector's <=> operator; similarity is 1 - distance. */
    public List<Match> search(UUID userId, List<Float> queryVector, int limit) {
        if (queryVector.isEmpty()) return List.of();

        return jdbc.sql("""
                SELECT document_id, chunk_text, 1 - (embedding <=> CAST(:vec AS VECTOR)) AS similarity
                FROM document_embeddings
                WHERE user_id = :user AND embedding IS NOT NULL
                ORDER BY embedding <=> CAST(:vec AS VECTOR)
                LIMIT :limit
                """)
                .param("user", userId)
                .param("vec", toVectorLiteral(queryVector))
                .param("limit", limit)
                .query((rs, n) -> new Match(
                        rs.getObject("document_id", UUID.class),
                        rs.getString("chunk_text"),
                        rs.getDouble("similarity")))
                .list();
    }

    private static String toVectorLiteral(List<Float> vector) {
        StringJoiner joiner = new StringJoiner(",", "[", "]");
        vector.forEach(v -> joiner.add(Float.toString(v)));
        return joiner.toString();
    }
}
