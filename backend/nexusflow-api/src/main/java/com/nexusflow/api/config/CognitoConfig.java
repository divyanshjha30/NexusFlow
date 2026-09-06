package com.nexusflow.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;

import java.net.URI;

@Configuration
public class CognitoConfig {

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
}
