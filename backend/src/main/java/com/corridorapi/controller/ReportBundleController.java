package com.corridorapi.controller;

import com.corridorapi.model.response.ProgressEvent;
import com.corridorapi.service.BundleCache;
import com.corridorapi.service.ReportBundleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Two endpoints:
 *
 *   GET /api/outputs/report-bundle/stream?species=badger&bbox=5.74,52.05,5.86,52.12
 *     Returns an SSE stream.  Emits structured ProgressEvent JSON objects as
 *     "progress" events.  Final event has phase="complete" and token=<UUID>.
 *
 *   GET /api/outputs/report-bundle/download?token=<UUID>
 *     Returns the assembled ZIP for download.  Token expires after TTL (default 15 min).
 *
 * The SSE stream runs the full pipeline on a virtual thread so it never blocks
 * the Tomcat thread pool.
 */
@Slf4j
@RestController
@RequestMapping("/api/outputs/report-bundle")
@RequiredArgsConstructor
public class ReportBundleController {

    private final ReportBundleService bundleService;
    private final BundleCache bundleCache;
    private final ObjectMapper objectMapper;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam String species,
            @RequestParam String bbox) {

        // 5-minute timeout — enough for the longest generation run
        SseEmitter emitter = new SseEmitter(300_000L);

        Thread.ofVirtual().name("bundle-gen-" + species).start(() -> {
            try {
                bundleService.generate(species, bbox, event -> {
                    try {
                        String json = objectMapper.writeValueAsString(event);
                        emitter.send(SseEmitter.event()
                                .name("progress")
                                .data(json));
                        if ("complete".equals(event.phase()) || "error".equals(event.phase())) {
                            emitter.complete();
                        }
                    } catch (Exception e) {
                        log.warn("Failed to send SSE event: {}", e.getMessage());
                    }
                });
            } catch (Exception e) {
                log.error("Bundle generation thread failed", e);
                try {
                    emitter.send(SseEmitter.event()
                            .name("progress")
                            .data(objectMapper.writeValueAsString(ProgressEvent.error(e.getMessage()))));
                } catch (Exception ignored) {}
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    @GetMapping("/download")
    public ResponseEntity<byte[]> download(@RequestParam String token) {
        byte[] data = bundleCache.retrieveData(token).orElse(null);
        if (data == null) {
            return ResponseEntity.notFound().build();
        }
        String filename = bundleCache.retrieveFilename(token)
                .orElse("corridor-bundle.zip");

        ContentDisposition cd = ContentDisposition.attachment().filename(filename).build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .body(data);
    }
}
