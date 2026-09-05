package com.nexusflow.api.controller;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, String> modules = new LinkedHashMap<>();
        modules.put("database", checkDatabase());

        boolean allUp = modules.values().stream().allMatch("UP"::equals);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", allUp ? "UP" : "DEGRADED");
        body.put("modules", modules);
        body.put("checkedAt", Instant.now().toString());
        return ResponseEntity.ok(body);
    }

    private String checkDatabase() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return "UP";
        } catch (Exception e) {
            return "DOWN";
        }
    }
}
