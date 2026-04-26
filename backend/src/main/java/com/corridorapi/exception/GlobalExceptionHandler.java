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
import org.springframework.core.io.buffer.DataBufferLimitException;
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
        return upstreamErrorResponse(ex.getStatusCode().value(), ex.getStatusText(), ex.getMessage());
    }

    /**
     * Reactor wraps the last failure in RetryExhaustedException after backoff retries exhaust.
     * Without this handler, Spring resolves it via the generic Exception handler — which loses the
     * 429/504 origin status and renders as "internal_error". Unwrap to the cause and surface the
     * real upstream status.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        Throwable cause = ex.getCause();
        if (cause instanceof WebClientResponseException wcre) {
            log.warn("Retries exhausted; last upstream status was {}", wcre.getStatusCode().value());
            int code = wcre.getStatusCode().value();
            String msg = "Overpass exhausted retries (last status " + code + " " + wcre.getStatusText()
                + "). Wait ~1 minute for Overpass to clear the throttle, then retry.";
            return upstreamErrorResponse(code, wcre.getStatusText(), msg);
        }
        if (cause instanceof WebClientRequestException wcre) {
            return upstreamUnreachableResponse(wcre);
        }
        log.warn("IllegalStateException without recognised upstream cause: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(body("internal_error: " + describe(ex), 500));
    }

    private ResponseEntity<Map<String, Object>> upstreamErrorResponse(int upstream, String statusText, String contextMsg) {
        log.warn("Upstream returned {}: {}", upstream, contextMsg);
        HttpStatus status;
        if (upstream == 401 || upstream == 403) status = HttpStatus.BAD_GATEWAY;
        else if (upstream == 404) status = HttpStatus.NOT_FOUND;
        else if (upstream == 429) status = HttpStatus.TOO_MANY_REQUESTS;
        else status = HttpStatus.BAD_GATEWAY;
        // Surface a meaningful label even when statusText comes back blank.
        String label = (statusText == null || statusText.isBlank())
            ? HttpStatus.resolve(upstream) != null ? HttpStatus.resolve(upstream).getReasonPhrase() : ("status " + upstream)
            : statusText;
        Map<String, Object> body = body("upstream_error: " + label + " (status " + upstream + ")", status.value());
        body.put("upstreamStatus", upstream);
        return ResponseEntity.status(status).body(body);
    }

    private ResponseEntity<Map<String, Object>> upstreamUnreachableResponse(WebClientRequestException ex) {
        String detail = describe(ex);
        log.warn("Upstream connection failed: {}", detail);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(body("upstream_unreachable: " + detail, 502));
    }

    @ExceptionHandler(WebClientRequestException.class)
    public ResponseEntity<Map<String, Object>> handleUpstreamConnect(WebClientRequestException ex) {
        return upstreamUnreachableResponse(ex);
    }

    /**
     * Overpass returned a body bigger than `webclient.max-in-memory-size-bytes`. Most likely cause:
     * the bbox is large + populated, so building/road geometry exploded. Tell the user to narrow the
     * region rather than dumping a stacktrace.
     */
    @ExceptionHandler(DataBufferLimitException.class)
    public ResponseEntity<Map<String, Object>> handleBufferLimit(DataBufferLimitException ex) {
        log.warn("Upstream response exceeded buffer limit: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(body("upstream_response_too_large: the OSM area you selected returned more data than the server is configured to buffer. Pick a smaller bbox.", 413));
    }

    /**
     * Walk the cause chain and produce a non-null human description. WebClientRequestException
     * frequently arrives with a null message (timeouts, resets) and the real signal is in cause.
     */
    private static String describe(Throwable t) {
        if (t == null) return "unknown";
        String msg = t.getMessage();
        if (msg != null && !msg.isBlank()) return t.getClass().getSimpleName() + ": " + msg;
        Throwable cause = t.getCause();
        if (cause != null && cause != t) return t.getClass().getSimpleName() + " caused by " + describe(cause);
        return t.getClass().getSimpleName();
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
