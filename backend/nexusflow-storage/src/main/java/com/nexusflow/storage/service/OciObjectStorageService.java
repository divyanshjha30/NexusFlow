package com.nexusflow.storage.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusflow.common.enums.CloudProvider;
import com.nexusflow.common.exception.NexusFlowException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * OCI Object Storage over its native REST API. The official SDK requires a
 * signing key and config file, which the local emulator does not enforce.
 */
@Service
public class OciObjectStorageService implements CloudStorage {

    private static final Logger log = LoggerFactory.getLogger(OciObjectStorageService.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper;
    private final String endpoint;
    private final String namespace;
    private final String bucket;
    private final String compartmentId;

    public OciObjectStorageService(
            ObjectMapper mapper,
            @Value("${nexusflow.oci.endpoint}") String endpoint,
            @Value("${nexusflow.oci.namespace}") String namespace,
            @Value("${nexusflow.oci.bucket}") String bucket,
            @Value("${nexusflow.oci.compartment-id}") String compartmentId) {
        this.mapper = mapper;
        this.endpoint = endpoint;
        this.namespace = namespace;
        this.bucket = bucket;
        this.compartmentId = compartmentId;
    }

    @Override
    public CloudProvider provider() {
        return CloudProvider.OCI;
    }

    @Override
    public String upload(String key, String contentType, byte[] bytes) {
        ensureBucket();
        try {
            String url = "%s/n/%s/b/%s/o/%s".formatted(
                    endpoint, namespace, bucket, URLEncoder.encode(key, StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .header("Content-Type", contentType)
                    .timeout(TIMEOUT)
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes))
                    .build();

            int status = http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status >= 300) {
                throw new NexusFlowException("OCI_UPLOAD_FAILED", "HTTP " + status + " storing " + key);
            }
            return key;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new NexusFlowException("OCI_UPLOAD_FAILED", "Interrupted storing " + key, e);
        } catch (NexusFlowException e) {
            throw e;
        } catch (Exception e) {
            throw new NexusFlowException("OCI_UPLOAD_FAILED", "Could not upload " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            String url = "%s/n/%s/b/%s/o/%s".formatted(
                    endpoint, namespace, bucket, URLEncoder.encode(key, StandardCharsets.UTF_8));

            int status = http.send(
                    HttpRequest.newBuilder(URI.create(url)).timeout(TIMEOUT).DELETE().build(),
                    HttpResponse.BodyHandlers.discarding()).statusCode();

            if (status >= 300 && status != 404) {
                throw new NexusFlowException("OCI_DELETE_FAILED", "HTTP " + status + " deleting " + key);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new NexusFlowException("OCI_DELETE_FAILED", "Interrupted deleting " + key, e);
        } catch (NexusFlowException e) {
            throw e;
        } catch (Exception e) {
            throw new NexusFlowException("OCI_DELETE_FAILED", "Could not delete " + key, e);
        }
    }

    @Override
    public long objectCount() {
        try {
            String url = "%s/n/%s/b/%s/o".formatted(endpoint, namespace, bucket);
            HttpResponse<String> response = http.send(
                    HttpRequest.newBuilder(URI.create(url)).timeout(TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) return 0;
            var node = mapper.readTree(response.body()).path("objects");
            return node.isArray() ? node.size() : 0;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return 0;
        } catch (Exception e) {
            log.debug("Could not count OCI objects: {}", e.getMessage());
            return 0;
        }
    }

    private void ensureBucket() {
        try {
            String head = "%s/n/%s/b/%s".formatted(endpoint, namespace, bucket);
            int status = http.send(
                    HttpRequest.newBuilder(URI.create(head)).timeout(TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status < 300) return;

            String body = mapper.writeValueAsString(Map.of(
                    "name", bucket,
                    "compartmentId", compartmentId));

            http.send(HttpRequest.newBuilder(URI.create("%s/n/%s/b/".formatted(endpoint, namespace)))
                            .header("Content-Type", "application/json")
                            .timeout(TIMEOUT)
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build(),
                    HttpResponse.BodyHandlers.discarding());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.debug("Could not ensure OCI bucket: {}", e.getMessage());
        }
    }
}
