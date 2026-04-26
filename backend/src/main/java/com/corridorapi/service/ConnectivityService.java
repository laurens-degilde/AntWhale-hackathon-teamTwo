package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.ConnectivityResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Real connectivity computation: composes the corridor pipeline (OSM raster →
 * per-species resistance → patches → Circuitscape pairwise current density)
 * and emits the down-sampled current-density grid the frontend renders.
 *
 * `engine` is currently informational — Circuitscape is the only wired backend.
 * OMNISCAPE remains an option in the API surface for the eventual moving-window
 * variant on very large bboxes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConnectivityService {

    private final CorridorPipeline pipeline;

    public ConnectivityResponse compute(SpeciesType species, double[] bbox, String engine) {
        try {
            CorridorPipeline.Output out = pipeline.compute(species, bbox);
            return ConnectivityResponse.builder()
                .species(species.getKey())
                .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
                .resolution("100m")
                .engine(engine)
                .gridWidth(out.width())
                .gridHeight(out.height())
                .meanCurrentDensity(round(out.circuit().meanCurrentDensity()))
                .maxCurrentDensity(round(out.circuit().maxCurrentDensity()))
                .currentDensityGrid(toListGrid(out.circuit().currentDensity()))
                .status("OK")
                .message(String.format(
                    "Circuitscape pairwise current density across %d focal nodes (habitat patches) "
                    + "on a %d×%d resistance raster derived from live OSM landuse + roads + barriers.",
                    Math.min(out.patches().size(), 8), out.width(), out.height()))
                .build();
        } catch (IllegalStateException ex) {
            String msg = ex.getMessage();
            if (msg != null && msg.startsWith("Retries exhausted")) {
                log.warn("Connectivity failed: upstream retries exhausted ({})", msg);
                throw ex;
            }
            log.warn("Connectivity skipped: {}", msg);
            return ConnectivityResponse.builder()
                .species(species.getKey())
                .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
                .resolution("100m")
                .engine(engine)
                .gridWidth(0)
                .gridHeight(0)
                .meanCurrentDensity(0.0)
                .maxCurrentDensity(0.0)
                .currentDensityGrid(List.of())
                .status("INSUFFICIENT_HABITAT")
                .message(msg)
                .build();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.error("Circuitscape failed", e);
            throw new RuntimeException("Circuitscape failed: " + e.getMessage(), e);
        }
    }

    private static List<List<Double>> toListGrid(double[][] grid) {
        List<List<Double>> out = new ArrayList<>(grid.length);
        for (double[] row : grid) {
            List<Double> r = new ArrayList<>(row.length);
            for (double v : row) {
                r.add(Double.isFinite(v) ? round(v) : 0.0);
            }
            out.add(r);
        }
        return out;
    }

    private static double round(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}
