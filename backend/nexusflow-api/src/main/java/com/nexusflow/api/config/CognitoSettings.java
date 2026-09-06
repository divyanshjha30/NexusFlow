package com.nexusflow.api.config;

/** Resolved Cognito identifiers, discovered at startup rather than pinned in config. */
public record CognitoSettings(
        String userPoolId,
        String clientId,
        String jwkSetUri,
        String issuer) {
}
