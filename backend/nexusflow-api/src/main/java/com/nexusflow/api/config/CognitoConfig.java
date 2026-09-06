package com.nexusflow.api.config;

import com.nexusflow.common.exception.NexusFlowException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CreateUserPoolClientRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CreateUserPoolRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ExplicitAuthFlowsType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUserPoolClientsRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUserPoolsRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserPoolDescriptionType;

import java.net.URI;
import java.util.Optional;

@Configuration
public class CognitoConfig {

    private static final Logger log = LoggerFactory.getLogger(CognitoConfig.class);

    @Bean
    CognitoIdentityProviderClient cognitoClient(
            @Value("${nexusflow.aws.endpoint}") String endpoint,
            @Value("${nexusflow.aws.region}") String region,
            @Value("${nexusflow.aws.access-key}") String accessKey,
            @Value("${nexusflow.aws.secret-key}") String secretKey) {

        return CognitoIdentityProviderClient.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    /**
     * The local emulator keeps Cognito state in memory, so pool IDs change every time
     * it restarts. Resolving the pool by name (and recreating it when absent) keeps
     * sign-in working without editing config by hand.
     */
    @Bean
    CognitoSettings cognitoSettings(
            CognitoIdentityProviderClient cognito,
            @Value("${nexusflow.aws.endpoint}") String endpoint,
            @Value("${nexusflow.cognito.pool-name}") String poolName,
            @Value("${nexusflow.cognito.client-name}") String clientName,
            @Value("${nexusflow.cognito.issuer-base}") String issuerBase,
            @Value("${nexusflow.cognito.auto-provision}") boolean autoProvision,
            @Value("${nexusflow.cognito.user-pool-id:}") String configuredPoolId,
            @Value("${nexusflow.cognito.client-id:}") String configuredClientId) {

        if (!autoProvision) {
            if (configuredPoolId.isBlank() || configuredClientId.isBlank()) {
                throw new NexusFlowException("COGNITO_NOT_CONFIGURED",
                        "Set nexusflow.cognito.user-pool-id and client-id, or enable auto-provision");
            }
            return settingsFor(configuredPoolId, configuredClientId, endpoint, issuerBase);
        }

        String poolId = findPool(cognito, poolName)
                .orElseGet(() -> createPool(cognito, poolName));
        String clientId = findClient(cognito, poolId, clientName)
                .orElseGet(() -> createClient(cognito, poolId, clientName));

        log.info("Cognito ready: pool={} client={}", poolId, clientId);
        return settingsFor(poolId, clientId, endpoint, issuerBase);
    }

    private static CognitoSettings settingsFor(
            String poolId, String clientId, String endpoint, String issuerBase) {
        return new CognitoSettings(
                poolId,
                clientId,
                "%s/%s/.well-known/jwks.json".formatted(endpoint, poolId),
                "%s/%s".formatted(issuerBase, poolId));
    }

    private static Optional<String> findPool(CognitoIdentityProviderClient cognito, String poolName) {
        return cognito.listUserPools(ListUserPoolsRequest.builder().maxResults(60).build())
                .userPools().stream()
                .filter(p -> poolName.equals(p.name()))
                .map(UserPoolDescriptionType::id)
                .findFirst();
    }

    private static String createPool(CognitoIdentityProviderClient cognito, String poolName) {
        String id = cognito.createUserPool(CreateUserPoolRequest.builder()
                .poolName(poolName)
                .build()).userPool().id();
        log.warn("Cognito pool '{}' was missing and has been recreated as {}", poolName, id);
        return id;
    }

    private static Optional<String> findClient(
            CognitoIdentityProviderClient cognito, String poolId, String clientName) {
        return cognito.listUserPoolClients(ListUserPoolClientsRequest.builder()
                        .userPoolId(poolId).maxResults(60).build())
                .userPoolClients().stream()
                .filter(c -> clientName.equals(c.clientName()))
                .map(c -> c.clientId())
                .findFirst();
    }

    private static String createClient(
            CognitoIdentityProviderClient cognito, String poolId, String clientName) {
        return cognito.createUserPoolClient(CreateUserPoolClientRequest.builder()
                .userPoolId(poolId)
                .clientName(clientName)
                .explicitAuthFlows(
                        ExplicitAuthFlowsType.ALLOW_USER_PASSWORD_AUTH,
                        ExplicitAuthFlowsType.ALLOW_REFRESH_TOKEN_AUTH,
                        ExplicitAuthFlowsType.ALLOW_ADMIN_USER_PASSWORD_AUTH)
                .build()).userPoolClient().clientId();
    }
}
