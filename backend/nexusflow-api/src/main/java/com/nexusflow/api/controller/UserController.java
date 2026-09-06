package com.nexusflow.api.controller;

import com.nexusflow.api.service.CurrentUserService;
import com.nexusflow.api.service.DocumentService;
import com.nexusflow.common.dto.UserProfileDto;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final JdbcClient jdbc;
    private final DocumentService documents;
    private final CurrentUserService users;

    public UserController(DataSource dataSource, DocumentService documents, CurrentUserService users) {
        this.jdbc = JdbcClient.create(dataSource);
        this.documents = documents;
        this.users = users;
    }

    @GetMapping("/me")
    public UserProfileDto me() {
        UUID id = users.currentUserId();

        record Row(String email, String displayName, String role, long limit) {}

        Row row = jdbc.sql("""
                SELECT email, display_name, role, storage_limit_bytes
                FROM users WHERE id = :id
                """)
                .param("id", id)
                .query((rs, n) -> new Row(
                        rs.getString("email"),
                        rs.getString("display_name"),
                        rs.getString("role"),
                        rs.getLong("storage_limit_bytes")))
                .single();

        long count = jdbc.sql("SELECT COUNT(*) FROM documents WHERE user_id = :id AND deleted_at IS NULL")
                .param("id", id)
                .query(Long.class)
                .single();

        return new UserProfileDto(
                id, row.email(), row.displayName(), row.role(),
                documents.storageUsed(id), row.limit(), count);
    }
}
