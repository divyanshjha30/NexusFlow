package com.nexusflow.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** Single entry point for publishing domain events. */
@Service
public class EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(EventPublisher.class);

    private final KafkaTemplate<String, Object> kafka;

    public EventPublisher(KafkaTemplate<String, Object> kafka) {
        this.kafka = kafka;
    }

    /** Keyed by document so all events for one document keep their order. */
    public void publish(String topic, UUID key, Object event) {
        kafka.send(topic, key.toString(), event).whenComplete((result, error) -> {
            if (error != null) {
                log.error("Failed to publish to {}: {}", topic, error.getMessage());
            } else {
                log.debug("Published {} to {} partition {}", event.getClass().getSimpleName(),
                        topic, result.getRecordMetadata().partition());
            }
        });
    }
}
