package com.nexusflow.api.service;

import com.nexusflow.common.dto.CloudStatusDto;
import com.nexusflow.common.enums.CloudProvider;
import com.nexusflow.storage.service.S3StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class CloudHealthService {

    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    private final S3StorageService s3;

    private final Map<CloudProvider, String> endpoints;
    private final Map<CloudProvider, java.util.List<String>> services = Map.of(
            CloudProvider.AWS, java.util.List.of("S3", "DynamoDB", "Bedrock Runtime", "Cognito", "SQS", "SNS"),
            CloudProvider.AZURE, java.util.List.of("Blob", "Queue", "Service Bus", "Cosmos DB", "Key Vault"),
            CloudProvider.GCP, java.util.List.of("Storage", "Pub/Sub", "Firestore", "Vertex AI", "BigQuery"),
            CloudProvider.OCI, java.util.List.of("Object Storage", "Streaming", "Vault", "Monitoring"));

    public CloudHealthService(
            S3StorageService s3,
            @Value("${nexusflow.aws.endpoint}") String aws,
            @Value("${nexusflow.azure.endpoint}") String azure,
            @Value("${nexusflow.gcp.endpoint}") String gcp,
            @Value("${nexusflow.oci.endpoint}") String oci) {
        this.s3 = s3;
        this.endpoints = new LinkedHashMap<>();
        endpoints.put(CloudProvider.AWS, aws);
        endpoints.put(CloudProvider.AZURE, azure);
        endpoints.put(CloudProvider.GCP, gcp);
        endpoints.put(CloudProvider.OCI, oci);
    }

    public Map<CloudProvider, CloudStatusDto> checkAll() {
        Map<CloudProvider, CloudStatusDto> result = new LinkedHashMap<>();
        endpoints.forEach((cloud, endpoint) -> result.put(cloud, check(cloud, endpoint)));
        return result;
    }

    private CloudStatusDto check(CloudProvider cloud, String endpoint) {
        long start = System.currentTimeMillis();
        boolean up = ping(endpoint);
        long latency = System.currentTimeMillis() - start;

        String state = up ? "UP" : "DOWN";
        Map<String, String> serviceStates = new LinkedHashMap<>();
        services.getOrDefault(cloud, java.util.List.of()).forEach(s -> serviceStates.put(s, state));

        long objects = cloud == CloudProvider.AWS && up ? s3.objectCount() : 0;
        return new CloudStatusDto(state, endpoint, serviceStates, latency, objects);
    }

    private boolean ping(String endpoint) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                    .timeout(TIMEOUT)
                    .GET()
                    .build();
            int code = http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            // Emulator roots often answer 404; anything below 500 means it is listening.
            return code < 500;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
