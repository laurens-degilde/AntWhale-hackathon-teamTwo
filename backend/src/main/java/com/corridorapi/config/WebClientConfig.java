package com.corridorapi.config;

import com.corridorapi.client.WebClientLoggingFilter;
import io.netty.channel.ChannelOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    private final ExternalApiConfig external;
    private final int maxInMemoryBytes;
    private final int connectTimeoutMs;
    private final int responseTimeoutMs;

    public WebClientConfig(
            ExternalApiConfig external,
            @Value("${webclient.max-in-memory-size-bytes:16777216}") int maxInMemoryBytes,
            @Value("${webclient.connect-timeout-ms:10000}") int connectTimeoutMs,
            @Value("${webclient.response-timeout-ms:30000}") int responseTimeoutMs) {
        this.external = external;
        this.maxInMemoryBytes = maxInMemoryBytes;
        this.connectTimeoutMs = connectTimeoutMs;
        this.responseTimeoutMs = responseTimeoutMs;
    }

    private WebClient.Builder baseBuilder() {
        HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
            .responseTimeout(Duration.ofMillis(responseTimeoutMs));
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .codecs(c -> c.defaultCodecs().maxInMemorySize(maxInMemoryBytes))
            .filter(WebClientLoggingFilter.logRequestsAndResponses());
    }

    @Bean
    public WebClient inaturalistWebClient() {
        return baseBuilder()
            .baseUrl(external.getInaturalist().getBaseUrl())
            .defaultHeader(HttpHeaders.ACCEPT, "application/json")
            .build();
    }

    @Bean
    public WebClient gbifWebClient() {
        return baseBuilder()
            .baseUrl(external.getGbif().getBaseUrl())
            .defaultHeader(HttpHeaders.ACCEPT, "application/json")
            .build();
    }

    @Bean
    public WebClient overpassWebClient() {
        return baseBuilder()
            .baseUrl(external.getOverpass().getBaseUrl())
            .build();
    }

    @Bean
    public WebClient copernicusWebClient() {
        return baseBuilder()
            .baseUrl(external.getCopernicus().getBaseUrl())
            .build();
    }

    @Bean
    public WebClient rijkswaterstaatWebClient() {
        return baseBuilder()
            .baseUrl(external.getRijkswaterstaat().getBaseUrl())
            .build();
    }
}
