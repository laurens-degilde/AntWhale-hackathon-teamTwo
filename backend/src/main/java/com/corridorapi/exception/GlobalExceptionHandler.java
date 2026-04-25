package com.corridorapi.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    private Map<String, Object> body(String error, int status) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("error", error);
        m.put("status", status);
        m.put("timestamp", Instant.now().toString());
        return m;
    }

    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<Map<String, Object>> handleUpstreamResponse(WebClientResponseException ex) {
        log.warn("Upstream returned {}: {}", ex.getStatusCode().value(), ex.getMessage());
        HttpStatus status;
        int upstream = ex.getStatusCode().value();
        if (upstream == 401 || upstream == 403) {
            status = HttpStatus.BAD_GATEWAY;
        } else if (upstream == 404) {
            status = HttpStatus.NOT_FOUND;
        } else if (upstream == 429) {
            status = HttpStatus.TOO_MANY_REQUESTS;
        } else if (upstream >= 500) {
            status = HttpStatus.BAD_GATEWAY;
        } else {
            status = HttpStatus.BAD_GATEWAY;
        }
        Map<String, Object> body = body("upstream_error: " + ex.getStatusText(), status.value());
        body.put("upstreamStatus", upstream);
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(WebClientRequestException.class)
    public ResponseEntity<Map<String, Object>> handleUpstreamConnect(WebClientRequestException ex) {
        log.warn("Upstream connection failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(body("upstream_unreachable: " + ex.getMessage(), 502));
    }

    @ExceptionHandler({IllegalArgumentException.class,
                       MissingServletRequestParameterException.class,
                       MethodArgumentTypeMismatchException.class,
                       MethodArgumentNotValidException.class,
                       ConstraintViolationException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(Exception ex) {
        log.info("Bad request: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(body(ex.getMessage(), 400));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(body("internal_error: " + ex.getMessage(), 500));
    }
}
