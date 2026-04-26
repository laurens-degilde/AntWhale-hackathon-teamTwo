package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.PinchPoint;
import com.corridorapi.model.response.PinchPointResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Pre-computes Circuitscape pinch points for every (species × showcase region) combination
 * and persists them to a JSON file. Additive: loads what's already in the file, only computes
 * missing combos, writes the merged result. So a partial first run + a restart eventually
 * fills in everything.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CorridorCacheWarmer {

    /** Mirrors REGION_PRESETS in frontend/src/api/technicalReport.ts. */
    private static final List<RegionPreset> SHOWCASE_REGIONS = List.of(
        new RegionPreset("hoge-veluwe",          "5.74,52.05,5.86,52.12"),
        new RegionPreset("utrechtse-heuvelrug",  "5.20,52.00,5.45,52.15"),
        new RegionPreset("biesbosch",            "4.70,51.70,4.95,51.82"),
        new RegionPreset("salland-twente",       "6.00,52.20,6.40,52.45")
    );

    private record RegionPreset(String id, String bbox) {}

    private final CorridorPipeline pipeline;
    private final PinchPointService pinchPointService;
    private final ObjectMapper objectMapper;

    @Value("${corridor.warmed-output-file:critical-pinches.json}")
    private String outputFile;

    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void warm() {
        Path persisted = Paths.get(outputFile).toAbsolutePath();
        List<Row> existing = readExisting(persisted);
        Set<String> alreadyDone = new HashSet<>();
        for (Row r : existing) alreadyDone.add(r.species() + "|" + r.region());

        int total = SpeciesType.values().length * SHOWCASE_REGIONS.size();
        int existingCombos = alreadyDone.size();
        int toCompute = total - existingCombos;
        log.info("Warmer starting: {} (species × region) combos exist in {} ({} pinches), {} still to compute",
            existingCombos, persisted, existing.size(), toCompute);

        if (toCompute == 0) {
            log.info("All combos already cached; nothing to do.");
            return;
        }

        long start = System.currentTimeMillis();
        int ok = 0, skipped = 0, failed = 0;
        List<Row> rows = new ArrayList<>(existing);

        for (SpeciesType species : SpeciesType.values()) {
            for (RegionPreset region : SHOWCASE_REGIONS) {
                String key = species.getKey() + "|" + region.id();
                if (alreadyDone.contains(key)) continue;
                try {
                    double[] bbox = parseBbox(region.bbox());
                    pipeline.compute(species, bbox);
                    PinchPointResponse pp = pinchPointService.identify(species, bbox, 8);
                    int added = 0;
                    for (PinchPoint p : pp.getPinchPoints()) {
                        if (p.getLocation() == null) continue;
                        rows.add(new Row(
                            species.getKey(), region.id(), p.getId(),
                            p.getLocation().getLat(), p.getLocation().getLng(),
                            p.getBottleneckScore() == null ? 0 : p.getBottleneckScore(),
                            p.getDominantLandCoverAtPoint(),
                            p.getBetweenPatches()));
                        added++;
                    }
                    ok++;
                    log.info("warmed: {} {} → {} pinches (combo {}/{})",
                        species.getKey(), region.id(), added, ok + skipped + failed, toCompute);
                    // Persist progress after every successful combo so a crash doesn't lose work.
                    writeJson(persisted, rows);
                } catch (IllegalStateException ex) {
                    skipped++;
                    log.info("skipped: {} {} — {}", species.getKey(), region.id(), ex.getMessage());
                    // Still mark as "done" by writing an empty marker so we don't retry on every restart.
                    rows.add(new Row(species.getKey(), region.id(), "__empty__",
                        0, 0, 0, "INSUFFICIENT_HABITAT", null));
                    writeJson(persisted, rows);
                } catch (Exception ex) {
                    failed++;
                    log.warn("failed: {} {} — {} (will retry on next startup)",
                        species.getKey(), region.id(), ex.getMessage());
                }
            }
        }

        log.info("Warming pass complete in {}s — ok={}, skipped={}, failed={}. File: {}",
            (System.currentTimeMillis() - start) / 1000, ok, skipped, failed, persisted);
        printTable(rows);
    }

    private record Row(String species, String region, String id,
                       double lat, double lng, double score,
                       String cover, String between) {}

    private List<Row> readExisting(Path path) {
        if (!Files.exists(path)) return new ArrayList<>();
        try {
            String json = Files.readString(path);
            if (json.isBlank()) return new ArrayList<>();
            Map<String, Object> root = objectMapper.readValue(json, new TypeReference<>() {});
            Object raw = root.get("pinches");
            if (!(raw instanceof List<?> list)) return new ArrayList<>();
            List<Row> rows = new ArrayList<>(list.size());
            for (Object o : list) {
                if (!(o instanceof Map<?, ?> m)) continue;
                rows.add(new Row(
                    str(m.get("species")), str(m.get("region")), str(m.get("id")),
                    num(m.get("lat")), num(m.get("lng")), num(m.get("score")),
                    str(m.get("cover")), str(m.get("between"))));
            }
            return rows;
        } catch (IOException ex) {
            log.warn("Could not read existing {}: {}", path, ex.getMessage());
            return new ArrayList<>();
        }
    }

    private void writeJson(Path path, List<Row> rows) {
        try {
            Map<String, Object> root = new LinkedHashMap<>();
            root.put("generated", Instant.now().toString());
            root.put("count", rows.size());
            root.put("regions", SHOWCASE_REGIONS);
            List<Map<String, Object>> pinches = new ArrayList<>(rows.size());
            for (Row r : rows) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("species", r.species());
                m.put("region", r.region());
                m.put("id", r.id());
                m.put("lat", r.lat());
                m.put("lng", r.lng());
                m.put("score", r.score());
                m.put("cover", r.cover());
                m.put("between", r.between());
                pinches.add(m);
            }
            root.put("pinches", pinches);
            ObjectMapper mapper = objectMapper.copy().enable(SerializationFeature.INDENT_OUTPUT);
            Files.writeString(path, mapper.writeValueAsString(root));
        } catch (IOException ex) {
            log.warn("Failed to persist warmed pinches to {}: {}", path, ex.getMessage());
        }
    }

    private static void printTable(List<Row> rows) {
        if (rows.isEmpty()) return;
        StringBuilder sb = new StringBuilder("\n");
        sb.append(String.format("%-22s %-22s %-12s %-9s %-9s %-7s %-22s %s%n",
            "species", "region", "id", "lat", "lng", "score", "cover", "between"));
        sb.append("─".repeat(140)).append('\n');
        for (Row r : rows) {
            if ("__empty__".equals(r.id())) continue;
            sb.append(String.format("%-22s %-22s %-12s %-9.4f %-9.4f %-7.3f %-22s %s%n",
                r.species(), r.region(), r.id(), r.lat(), r.lng(), r.score(),
                nz(r.cover()), nz(r.between())));
        }
        sb.append("─".repeat(140)).append('\n');
        long real = rows.stream().filter(r -> !"__empty__".equals(r.id())).count();
        long crit = rows.stream().filter(r -> r.score() >= 0.95 && !"__empty__".equals(r.id())).count();
        sb.append("Total pinch points: ").append(real).append('\n');
        sb.append("≥95% bottleneck score: ").append(crit).append('\n');
        log.info("{}", sb);
    }

    private static String nz(String s) { return s == null ? "" : s; }
    private static String str(Object o) { return o == null ? null : o.toString(); }
    private static double num(Object o) {
        if (o instanceof Number n) return n.doubleValue();
        if (o == null) return 0;
        try { return Double.parseDouble(o.toString()); } catch (NumberFormatException e) { return 0; }
    }

    private static double[] parseBbox(String s) {
        String[] p = s.split(",");
        return new double[]{
            Double.parseDouble(p[0].trim()),
            Double.parseDouble(p[1].trim()),
            Double.parseDouble(p[2].trim()),
            Double.parseDouble(p[3].trim())
        };
    }
}
