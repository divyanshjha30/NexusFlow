package com.nexusflow.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.nexusflow")
public class NexusFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexusFlowApplication.class, args);
    }
}
