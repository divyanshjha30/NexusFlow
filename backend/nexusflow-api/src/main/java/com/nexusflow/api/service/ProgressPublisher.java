package com.nexusflow.api.service;

import com.nexusflow.api.repository.EventRepository;
import com.nexusflow.common.dto.ProcessingEventDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** Broadcasts pipeline progress over STOMP and persists it as an audit trail. */
@Service
public class ProgressPublisher {

    private static final Logger log = LoggerFactory.getLogger(ProgressPublisher.class);

    private final SimpMessagingTemplate messaging;
    private final EventRepository events;

    public ProgressPublisher(SimpMessagingTemplate messaging, EventRepository events) {
        this.messaging = messaging;
        this.events = events;
    }

    public void publish(UUID documentId, UUID userId, String eventType, int progress,
                        String message, String cloud, Integer durationMs) {
        ProcessingEventDto event = ProcessingEventDto.of(documentId, eventType, progress, message);
        messaging.convertAndSend("/topic/documents", event);
        messaging.convertAndSend("/topic/documents/" + documentId, event);

        try {
            events.log(documentId, userId, eventType, message, cloud, durationMs);
        } catch (Exception e) {
            log.warn("Could not persist event {} for {}: {}", eventType, documentId, e.getMessage());
        }
    }

    public void publish(UUID documentId, UUID userId, String eventType, int progress, String message) {
        publish(documentId, userId, eventType, progress, message, null, null);
    }
}
