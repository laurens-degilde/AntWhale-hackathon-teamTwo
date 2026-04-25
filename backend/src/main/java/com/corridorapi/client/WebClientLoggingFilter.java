package com.corridorapi.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;

@Slf4j
public final class WebClientLoggingFilter {

    private WebClientLoggingFilter() {}

    public static ExchangeFilterFunction logRequestsAndResponses() {
        return (request, next) -> {
            long start = System.nanoTime();
            String url = request.url().toString();
            String method = request.method().name();
            log.info("[outbound] {} {} params={}", method, url, request.url().getQuery());
            return next.exchange(request)
                .doOnNext(response -> {
                    long elapsedMs = (System.nanoTime() - start) / 1_000_000;
                    log.info("[outbound] {} {} -> {} ({} ms)",
                        method, url, response.statusCode().value(), elapsedMs);
                })
                .doOnError(err -> {
                    long elapsedMs = (System.nanoTime() - start) / 1_000_000;
                    log.warn("[outbound] {} {} failed after {} ms: {}",
                        method, url, elapsedMs, err.toString());
                });
        };
    }
}
