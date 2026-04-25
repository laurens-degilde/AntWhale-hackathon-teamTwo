package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.PinchPoint;
import com.corridorapi.model.response.PinchPointResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Identifies bottleneck cells from the Circuitscape current-density raster.
 *
 * Algorithm (matches McRae et al. 2008 / Dickson et al. 2017 pinch-point methodology):
 *   1. Run the corridor pipeline (real OSM-derived resistance + Circuitscape pairwise mode).
 *   2. Find local maxima in the cumulative current-density raster — cells whose value
 *      is greater than all 8 neighbours, above a fraction of the global max.
 *   3. Tag each maximum with the dominant land-cover class at that pixel (drives intervention type)
 *      and the pair of nearest focal nodes (which patches it connects).
 *   4. Normalise current density to [0,1] across the surviving maxima → bottleneckScore.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PinchPointService {

    private static final double MIN_FRACTION_OF_MAX = 0.10;

    private final CorridorPipeline pipeline;

    public PinchPointResponse identify(SpeciesType species, double[] bbox, int topN) {
        try {
            CorridorPipeline.Output out = pipeline.compute(species, bbox);
            List<PinchPoint> picks = extractMaxima(out, topN);
            return PinchPointResponse.builder()
                .species(species.getKey())
                .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
                .topN(picks.size())
                .methodology(
                    "Local maxima of the Circuitscape pairwise cumulative current-density raster on a "
                    + out.width() + "×" + out.height() + " resistance grid derived from live OSM "
                    + "(landuse polygons + road network + barriers). Each maximum is tagged with the "
                    + "dominant OSM land-cover class at that cell and the two nearest habitat patches, "
                    + "matching McRae et al. (2008) Ecology 89:2712–24 pinch-point methodology.")
                .pinchPoints(picks)
                .status("OK")
                .build();
        } catch (IllegalStateException tooFew) {
            log.warn("Pinch points skipped: {}", tooFew.getMessage());
            return PinchPointResponse.builder()
                .species(species.getKey())
                .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
                .topN(0)
                .methodology(tooFew.getMessage())
                .pinchPoints(List.of())
                .status("INSUFFICIENT_HABITAT")
                .build();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.error("Circuitscape failed", e);
            throw new RuntimeException("Circuitscape failed: " + e.getMessage(), e);
        }
    }

    private static List<PinchPoint> extractMaxima(CorridorPipeline.Output out, int topN) {
        double[][] cd = out.circuit().currentDensity();
        int h = out.height();
        int w = out.width();
        double max = out.circuit().maxCurrentDensity();
        if (max <= 0) return List.of();
        double cutoff = max * MIN_FRACTION_OF_MAX;

        record Candidate(int x, int y, double value) {}
        List<Candidate> candidates = new ArrayList<>();

        for (int y = 1; y < h - 1; y++) {
            for (int x = 1; x < w - 1; x++) {
                double v = cd[y][x];
                if (!Double.isFinite(v) || v < cutoff) continue;
                if (!isLocalMax(cd, x, y, w, h)) continue;
                candidates.add(new Candidate(x, y, v));
            }
        }
        candidates.sort(Comparator.comparingDouble(Candidate::value).reversed());

        // Suppress neighbours: keep maxima at least 2 cells apart.
        List<Candidate> picked = new ArrayList<>();
        for (Candidate c : candidates) {
            boolean tooClose = false;
            for (Candidate p : picked) {
                if (Math.abs(p.x() - c.x()) <= 2 && Math.abs(p.y() - c.y()) <= 2) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) picked.add(c);
            if (picked.size() >= topN) break;
        }

        double bestKept = picked.isEmpty() ? max : picked.get(0).value();
        List<PinchPoint> out2 = new ArrayList<>(picked.size());
        for (int i = 0; i < picked.size(); i++) {
            Candidate c = picked.get(i);
            double[] lonLat = pixelToLonLat(c.x(), c.y(), out.bbox(), w, h);
            String landCover = out.landCover().getCells()[c.y()][c.x()];
            String between = nearestPatchPair(out.patches(), c.x(), c.y());
            double score = bestKept > 0 ? c.value() / bestKept : 0;

            out2.add(PinchPoint.builder()
                .id("pp-" + (i + 1))
                .location(GeoPoint.builder()
                    .lng(round6(lonLat[0]))
                    .lat(round6(lonLat[1]))
                    .build())
                .currentDensity(round3(c.value()))
                .bottleneckScore(round3(Math.min(1.0, score)))
                .dominantLandCoverAtPoint(landCover)
                .betweenPatches(between)
                .build());
        }
        return out2;
    }

    private static boolean isLocalMax(double[][] g, int x, int y, int w, int h) {
        double v = g[y][x];
        for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                if (dx == 0 && dy == 0) continue;
                int nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                double nv = g[ny][nx];
                if (Double.isFinite(nv) && nv > v) return false;
            }
        }
        return true;
    }

    private static String nearestPatchPair(List<CorridorPipeline.Patch> patches, int x, int y) {
        if (patches.size() < 2) return patches.isEmpty() ? "n/a" : patches.get(0).id();
        CorridorPipeline.Patch first = null, second = null;
        double firstD = Double.MAX_VALUE, secondD = Double.MAX_VALUE;
        for (CorridorPipeline.Patch p : patches) {
            double d = Math.hypot(p.centroidX() - x, p.centroidY() - y);
            if (d < firstD) {
                second = first; secondD = firstD;
                first = p; firstD = d;
            } else if (d < secondD) {
                second = p; secondD = d;
            }
        }
        return first.id() + " ↔ " + second.id();
    }

    private static double[] pixelToLonLat(int x, int y, double[] bbox, int width, int height) {
        double minLng = bbox[0], minLat = bbox[1], maxLng = bbox[2], maxLat = bbox[3];
        double lng = minLng + (x + 0.5) / width * (maxLng - minLng);
        double lat = maxLat - (y + 0.5) / height * (maxLat - minLat);
        return new double[]{lng, lat};
    }

    private static double round6(double v) { return Math.round(v * 1_000_000.0) / 1_000_000.0; }
    private static double round3(double v) { return Math.round(v * 1000.0) / 1000.0; }
}
