package com.nexusflow.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = "com.nexusflow")
@EnableAsync
public class NexusFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexusFlowApplication.class, args);
    }
}
