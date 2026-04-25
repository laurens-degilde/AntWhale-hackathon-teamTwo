package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.PinchPoint;
import com.corridorapi.model.response.PinchPointResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Identifies bottleneck locations from a current-density grid.
 * STUB: real implementation thresholds the Circuitscape current-density raster,
 * extracts local maxima within candidate-corridor zones, and intersects each
 * with the dominant land-cover class at that pixel to inform intervention type.
 */
@Service
public class PinchPointService {

    public PinchPointResponse identify(SpeciesType species, double[] bbox, int topN) {
        // Use deterministic positions derived from bbox so the response is stable across runs.
        double minLng = bbox[0], minLat = bbox[1], maxLng = bbox[2], maxLat = bbox[3];
        double w = maxLng - minLng;
        double h = maxLat - minLat;

        record Sample(double xPct, double yPct, double density, String landCover, String between) {}

        List<Sample> base = List.of(
            new Sample(0.50, 0.50, 0.94, "highway", "patch-1 ↔ patch-2"),
            new Sample(0.42, 0.55, 0.81, "highway", "patch-1 ↔ patch-2"),
            new Sample(0.38, 0.30, 0.72, "agricultural_field", "patch-1 ↔ patch-4"),
            new Sample(0.62, 0.45, 0.66, "secondary_road", "patch-2 ↔ patch-3"),
            new Sample(0.55, 0.62, 0.59, "fence_line", "patch-2 ↔ patch-3"),
            new Sample(0.30, 0.50, 0.51, "agricultural_field", "patch-1 ↔ patch-3"),
            new Sample(0.70, 0.65, 0.43, "secondary_road", "patch-2 ↔ patch-4"),
            new Sample(0.48, 0.20, 0.36, "fence_line", "patch-1 ↔ patch-4")
        );

        int n = Math.min(topN, base.size());
        List<PinchPoint> out = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            Sample s = base.get(i);
            out.add(PinchPoint.builder()
                .id("pp-" + (i + 1))
                .location(GeoPoint.builder()
                    .lng(Math.round((minLng + s.xPct() * w) * 1_000_000.0) / 1_000_000.0)
                    .lat(Math.round((minLat + s.yPct() * h) * 1_000_000.0) / 1_000_000.0)
                    .build())
                .currentDensity(s.density())
                .bottleneckScore(s.density())   // identity here — real impl normalises
                .dominantLandCoverAtPoint(s.landCover())
                .betweenPatches(s.between())
                .build());
        }

        return PinchPointResponse.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .topN(n)
            .methodology("Local maxima of the current-density raster within candidate-corridor zones (zones where shortest-path between source and destination patches passes through high-resistance land cover). Each maximum is scored by current density and tagged with its dominant land-cover class so the intervention classifier can pick the right archetype.")
            .pinchPoints(out)
            .status("STUB")
            .build();
    }
}
