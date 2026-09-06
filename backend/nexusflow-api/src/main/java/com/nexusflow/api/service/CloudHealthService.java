package com.nexusflow.api.service;

import com.nexusflow.common.dto.CloudStatusDto;
import com.nexusflow.common.enums.CloudProvider;
import com.nexusflow.storage.service.StorageOrchestrator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CloudHealthService {

    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private static final Map<CloudProvider, List<String>> SERVICES = Map.of(
            CloudProvider.AWS, List.of("S3", "DynamoDB", "Bedrock Runtime", "Cognito", "SQS", "SNS"),
            CloudProvider.AZURE, List.of("Blob", "Queue", "Service Bus", "Cosmos DB", "Key Vault"),
            CloudProvider.GCP, List.of("Storage", "Pub/Sub", "Firestore", "Vertex AI", "BigQuery"),
            CloudProvider.OCI, List.of("Object Storage", "Streaming", "Vault", "Monitoring"));

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    private final StorageOrchestrator storage;
    private final Map<CloudProvider, String> endpoints;

    public CloudHealthService(
            StorageOrchestrator storage,
            @Value("${nexusflow.aws.endpoint}") String aws,
            @Value("${nexusflow.azure.endpoint}") String azure,
            @Value("${nexusflow.gcp.endpoint}") String gcp,
            @Value("${nexusflow.oci.endpoint}") String oci) {
        this.storage = storage;
        this.endpoints = new LinkedHashMap<>();
        endpoints.put(CloudProvider.AWS, aws);
        endpoints.put(CloudProvider.AZURE, azure);
        endpoints.put(CloudProvider.GCP, gcp);
        endpoints.put(CloudProvider.OCI, oci);
    }

    public Map<CloudProvider, CloudStatusDto> checkAll() {
        Map<CloudProvider, Long> counts = storage.objectCounts();
        Map<CloudProvider, CloudStatusDto> result = new LinkedHashMap<>();

        endpoints.forEach((cloud, endpoint) -> {
            long start = System.currentTimeMillis();
            boolean up = ping(endpoint);
            long latency = System.currentTimeMillis() - start;

            String state = up ? "UP" : "DOWN";
            Map<String, String> serviceStates = new LinkedHashMap<>();
            SERVICES.getOrDefault(cloud, List.of()).forEach(s -> serviceStates.put(s, state));

            result.put(cloud, new CloudStatusDto(
                    state, endpoint, serviceStates, latency, counts.getOrDefault(cloud, 0L)));
        });

        return result;
    }

    private boolean ping(String endpoint) {
        try {
            int code = http.send(
                    HttpRequest.newBuilder(URI.create(endpoint)).timeout(TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.discarding()).statusCode();
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
