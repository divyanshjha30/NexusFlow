package com.nexusflow.api.controller;

import com.nexusflow.api.service.DocumentService;
import com.nexusflow.common.dto.UserProfileDto;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final JdbcClient jdbc;
    private final DocumentService documents;

    public UserController(DataSource dataSource, DocumentService documents) {
        this.jdbc = JdbcClient.create(dataSource);
        this.documents = documents;
    }

    @GetMapping("/me")
    public UserProfileDto me() {
        var row = jdbc.sql("""
                SELECT email, display_name, role, storage_limit_bytes
                FROM users WHERE id = :id
                """)
                .param("id", DocumentService.DEMO_USER_ID)
                .query((rs, n) -> new String[]{
                        rs.getString("email"),
                        rs.getString("display_name"),
                        rs.getString("role"),
                        String.valueOf(rs.getLong("storage_limit_bytes"))
                })
                .optional();

        long count = jdbc.sql("SELECT COUNT(*) FROM documents WHERE user_id = :id AND deleted_at IS NULL")
                .param("id", DocumentService.DEMO_USER_ID)
                .query(Long.class)
                .single();

        String[] user = row.orElse(new String[]{"demo@nexusflow.local", "Demo", "USER", "5368709120"});

        return new UserProfileDto(
                DocumentService.DEMO_USER_ID,
                user[0],
                user[1],
                user[2],
                documents.storageUsed(),
                Long.parseLong(user[3]),
                count);
    }
}
