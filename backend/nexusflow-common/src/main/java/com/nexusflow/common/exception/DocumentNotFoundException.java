package com.nexusflow.common.exception;

import java.util.UUID;

public class DocumentNotFoundException extends NexusFlowException {

    public DocumentNotFoundException(UUID documentId) {
        super("DOCUMENT_NOT_FOUND", "No document found with id " + documentId);
    }
}
