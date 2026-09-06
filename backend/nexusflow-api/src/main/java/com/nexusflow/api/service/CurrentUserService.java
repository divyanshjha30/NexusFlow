package com.nexusflow.api.service;

import com.nexusflow.common.exception.NexusFlowException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.UUID;

/**
 * Maps the Cognito principal to a local user row, provisioning it on first sight
 * so a freshly signed-up account works without a separate registration step.
 */
@Service
public class CurrentUserService {

    private static final String SUB = "sub";

    private final JdbcClient jdbc;

    public CurrentUserService(DataSource dataSource) {
        this.jdbc = JdbcClient.create(dataSource);
    }

    public UUID currentUserId() {
        Jwt jwt = currentJwt();
        String cognitoSub = jwt.getClaimAsString(SUB);

        return jdbc.sql("SELECT id FROM users WHERE cognito_sub = :sub")
                .param(SUB, cognitoSub)
                .query(UUID.class)
                .optional()
                .orElseGet(() -> provision(jwt));
    }

    public String currentEmail() {
        return currentJwt().getClaimAsString("email");
    }

    private Jwt currentJwt() {
        Object principal = SecurityContextHolder.getContext().getAuthentication() == null
                ? null
                : SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (principal instanceof Jwt jwt) return jwt;
        throw new NexusFlowException("UNAUTHENTICATED", "No authenticated principal on this request");
    }

    private UUID provision(Jwt jwt) {
        String cognitoSub = jwt.getClaimAsString(SUB);
        String email = jwt.getClaimAsString("email");
        String username = jwt.getClaimAsString("cognito:username");
        String identity = email != null ? email : cognitoSub;

        // An account may already exist from seeding or from a pool that was
        // recreated with new subject IDs; adopt it instead of colliding on email.
        Integer claimed = jdbc.sql("""
                UPDATE users SET cognito_sub = :sub
                WHERE email = :email AND cognito_sub <> :sub
                """)
                .param(SUB, cognitoSub)
                .param("email", identity)
                .update();

        if (claimed == 0) {
            jdbc.sql("""
                    INSERT INTO users (id, cognito_sub, email, display_name, role)
                    VALUES (:id, :sub, :email, :name, 'USER')
                    ON CONFLICT (cognito_sub) DO NOTHING
                    """)
                    .param("id", UUID.randomUUID())
                    .param(SUB, cognitoSub)
                    .param("email", identity)
                    .param("name", displayNameFrom(email, username))
                    .update();
        }

        return jdbc.sql("SELECT id FROM users WHERE cognito_sub = :sub")
                .param(SUB, cognitoSub)
                .query(UUID.class)
                .single();
    }

    private static String displayNameFrom(String email, String username) {
        String source = email != null ? email : username;
        if (source == null) return "User";
        String local = source.contains("@") ? source.substring(0, source.indexOf('@')) : source;
        return local.isBlank() ? "User" : local.substring(0, 1).toUpperCase() + local.substring(1);
    }
}
