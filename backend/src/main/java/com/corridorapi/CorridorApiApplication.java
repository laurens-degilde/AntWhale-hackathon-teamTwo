package com.corridorapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CorridorApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(CorridorApiApplication.class, args);
    }
}
