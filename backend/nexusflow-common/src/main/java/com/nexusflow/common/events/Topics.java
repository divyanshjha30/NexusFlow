package com.nexusflow.common.events;

/** Kafka topic names, matching the topics provisioned on the broker. */
public final class Topics {

    public static final String FILE_UPLOADED = "nexusflow.file.uploaded";
    public static final String FILE_STORED = "nexusflow.file.stored";
    public static final String FILE_STORED_FAILED = "nexusflow.file.stored.failed";
    public static final String AI_COMPLETE = "nexusflow.ai.complete";
    public static final String AI_FAILED = "nexusflow.ai.failed";
    public static final String DOCUMENT_DELETED = "nexusflow.document.deleted";
    public static final String AUDIT_LOG = "nexusflow.audit.log";

    private Topics() {
    }
}
