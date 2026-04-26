package com.corridorapi.controller;

import com.corridorapi.service.CriticalPinchesLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Pre-computed pinch points served from `critical-pinches.json` (produced by CorridorCacheWarmer).
 * Instant — no Circuitscape, no Overpass.
 *
 *   GET /api/critical-pinches?species=badger&minScore=0.95
 *   GET /api/critical-pinches?species=badger&minScore=0&bbox=5.74,52.05,5.86,52.12
 */
@RestController
@RequestMapping("/api/critical-pinches")
@RequiredArgsConstructor
public class CriticalPinchesController {

    private final CriticalPinchesLoader loader;

    @GetMapping
    public Map<String, Object> get(
            @RequestParam(required = false) String species,
            @RequestParam(defaultValue = "0.95") double minScore,
            @RequestParam(required = false) String bbox) {
        // Refresh on every call so warmer-written updates show up without a restart.
        loader.refresh();
        double[] bboxArr = parseBbox(bbox);
        List<Map<String, Object>> pinches = loader.get(species, minScore, bboxArr);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("species", species);
        body.put("minScore", minScore);
        body.put("bbox", bbox);
        body.put("count", pinches.size());
        body.put("source", loader.hasFile() ? "file" : "empty");
        body.put("pinches", pinches);
        return body;
    }

    private static double[] parseBbox(String bbox) {
        if (bbox == null || bbox.isBlank()) return null;
        String[] parts = bbox.split(",");
        if (parts.length != 4) throw new IllegalArgumentException("bbox must be minLng,minLat,maxLng,maxLat");
        try {
            return new double[]{
                Double.parseDouble(parts[0].trim()),
                Double.parseDouble(parts[1].trim()),
                Double.parseDouble(parts[2].trim()),
                Double.parseDouble(parts[3].trim())
            };
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("bbox values must be numeric: " + bbox);
        }
    }
}
