package com.corridorapi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

/**
 * Reads the persisted critical-pinches.json (produced by CorridorCacheWarmer) at startup so
 * the frontend can hit a single fast endpoint instead of recomputing 24 (species × region)
 * combinations on every boot.
 *
 * If the file is absent or empty, this component holds an empty list and the warmer takes
 * over — the next run will produce the file and subsequent boots will use it.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CriticalPinchesLoader {

    @Value("${corridor.warmed-output-file:critical-pinches.json}")
    private String filePath;

    private final ObjectMapper objectMapper;

    private List<Map<String, Object>> pinches = List.of();
    private boolean fileExists = false;

    @PostConstruct
    void load() {
        Path path = Paths.get(filePath).toAbsolutePath();
        if (!Files.exists(path)) {
            log.info("No persisted critical-pinches file at {} — warmer will populate it", path);
            return;
        }
        try {
            String json = Files.readString(path);
            if (json.isBlank()) return;
            Map<String, Object> root = objectMapper.readValue(json, new TypeReference<>() {});
            Object raw = root.get("pinches");
            if (raw instanceof List<?> list) {
                pinches = objectMapper.convertValue(list, new TypeReference<List<Map<String, Object>>>() {});
                fileExists = true;
                log.info("Loaded {} critical pinches from {}", pinches.size(), path);
            }
        } catch (IOException ex) {
            log.warn("Failed to read critical-pinches file {}: {}", path, ex.getMessage());
        }
    }

    public boolean hasFile() { return fileExists; }

    /**
     * Re-read the file from disk. Called by the controller before each request so the loader
     * picks up new entries written by the warmer without requiring a server restart.
     */
    public synchronized void refresh() { load(); }

    /**
     * Filter pinches by species (optional), score threshold, and an optional bbox
     * (minLng,minLat,maxLng,maxLat). Empty marker rows (id == "__empty__") are excluded.
     */
    public List<Map<String, Object>> get(String species, double minScore, double[] bbox) {
        return pinches.stream()
            .filter(p -> !"__empty__".equals(p.get("id")))
            .filter(p -> species == null || species.equals(p.get("species")))
            .filter(p -> p.get("score") instanceof Number n && n.doubleValue() >= minScore)
            .filter(p -> bbox == null || withinBbox(p, bbox))
            .toList();
    }

    private static boolean withinBbox(Map<String, Object> p, double[] bbox) {
        double lat = p.get("lat") instanceof Number n ? n.doubleValue() : Double.NaN;
        double lng = p.get("lng") instanceof Number n ? n.doubleValue() : Double.NaN;
        if (Double.isNaN(lat) || Double.isNaN(lng)) return false;
        return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
    }
}
