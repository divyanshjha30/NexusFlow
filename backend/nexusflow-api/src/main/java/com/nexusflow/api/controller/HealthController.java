package com.nexusflow.api.controller;

import com.nexusflow.api.service.CloudHealthService;
import com.nexusflow.common.dto.CloudStatusDto;
import com.nexusflow.common.enums.CloudProvider;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final JdbcClient jdbc;
    private final CloudHealthService clouds;

    public HealthController(DataSource dataSource, CloudHealthService clouds) {
        this.jdbc = JdbcClient.create(dataSource);
        this.clouds = clouds;
    }

    @GetMapping
    public Map<String, Object> health() {
        Map<String, String> modules = new LinkedHashMap<>();
        modules.put("database", checkDatabase());

        boolean allUp = modules.containsValue("UP") && !modules.containsValue("DOWN");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", allUp ? "UP" : "DEGRADED");
        body.put("modules", modules);
        body.put("checkedAt", Instant.now().toString());
        return body;
    }

    @GetMapping("/clouds")
    public Map<CloudProvider, CloudStatusDto> cloudHealth() {
        return clouds.checkAll();
    }

    private String checkDatabase() {
        try {
            jdbc.sql("SELECT 1").query(Integer.class).single();
            return "UP";
        } catch (Exception e) {
            return "DOWN";
        }
    }
}
