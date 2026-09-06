package com.nexusflow.storage.service;

/** One cloud target for document replication. */
public interface CloudStorage {

    com.nexusflow.common.enums.CloudProvider provider();

    /** Stores the bytes and returns the provider-specific object key. */
    String upload(String key, String contentType, byte[] bytes);

    /** Removes the replica. Implementations treat a missing object as success. */
    void delete(String key);

    long objectCount();
}
