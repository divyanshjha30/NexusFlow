package com.nexusflow.storage.service;

import com.nexusflow.common.enums.CloudProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiConsumer;

/** Fans a document out to every cloud in parallel. */
@Service
public class StorageOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(StorageOrchestrator.class);

    private final Map<CloudProvider, CloudStorage> targets;

    public StorageOrchestrator(List<CloudStorage> storages) {
        this.targets = storages.stream()
                .collect(java.util.stream.Collectors.toMap(CloudStorage::provider, s -> s));
    }

    public record Result(CloudProvider provider, String key, long durationMs, String error) {
        public boolean success() {
            return error == null;
        }
    }

    /**
     * Uploads to all clouds concurrently, invoking {@code onEach} as each finishes
     * so progress can be streamed rather than waiting for the slowest.
     */
    public List<Result> replicate(String key, String contentType, byte[] bytes, BiConsumer<CloudProvider, Result> onEach) {
        List<CompletableFuture<Result>> futures = targets.values().stream()
                .map(storage -> CompletableFuture.supplyAsync(() -> {
                    long start = System.currentTimeMillis();
                    try {
                        String stored = storage.upload(key, contentType, bytes);
                        Result r = new Result(storage.provider(), stored, System.currentTimeMillis() - start, null);
                        onEach.accept(storage.provider(), r);
                        return r;
                    } catch (Exception e) {
                        Throwable cause = e.getCause() == null ? e : e.getCause();
                        log.warn("{} replication failed for {}: {}", storage.provider(), key, cause.toString());
                        Result r = new Result(storage.provider(), null, System.currentTimeMillis() - start, cause.getMessage());
                        onEach.accept(storage.provider(), r);
                        return r;
                    }
                }))
                .toList();

        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();
        return futures.stream().map(CompletableFuture::join).toList();
    }

    /** Best-effort purge: one cloud refusing must not strand the replicas on the others. */
    public List<Result> purge(String key) {
        List<CompletableFuture<Result>> futures = targets.values().stream()
                .map(storage -> CompletableFuture.supplyAsync(() -> {
                    long start = System.currentTimeMillis();
                    try {
                        storage.delete(key);
                        return new Result(storage.provider(), key, System.currentTimeMillis() - start, null);
                    } catch (Exception e) {
                        Throwable cause = e.getCause() == null ? e : e.getCause();
                        log.warn("{} purge failed for {}: {}", storage.provider(), key, cause.toString());
                        return new Result(storage.provider(), null, System.currentTimeMillis() - start, cause.getMessage());
                    }
                }))
                .toList();

        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();
        return futures.stream().map(CompletableFuture::join).toList();
    }

    public Map<CloudProvider, Long> objectCounts() {
        return targets.entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(
                        Map.Entry::getKey,
                        e -> {
                            try {
                                return e.getValue().objectCount();
                            } catch (Exception ex) {
                                return 0L;
                            }
                        }));
    }
}
