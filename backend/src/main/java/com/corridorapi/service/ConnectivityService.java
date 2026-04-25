package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.ConnectivityResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Wraps Circuitscape (Julia) / Omniscape orchestration.
 * STUB: the real implementation will:
 *   1. fetch the resistance raster (per ResistanceSurfaceService)
 *   2. fetch source/destination patches (per HabitatPatchService)
 *   3. shell out to Circuitscape via a subprocess (Julia: `Circuitscape.compute`)
 *      or Omniscape for large regions
 *   4. read the resulting current-density GeoTIFF, downsample, and emit it here
 *
 * For now we synthesise a deterministic gradient + a localised hot spot so the
 * frontend can develop against realistic-looking data.
 */
@Service
public class ConnectivityService {

    public ConnectivityResponse compute(SpeciesType species, double[] bbox, String engine) {
        int width = 32;
        int height = 32;
        List<List<Double>> grid = new ArrayList<>(height);
        double sum = 0;
        double max = 0;

        // hotspot location simulating a pinch point ~middle of the bbox
        int hotX = width / 2;
        int hotY = height / 2;

        for (int y = 0; y < height; y++) {
            List<Double> row = new ArrayList<>(width);
            for (int x = 0; x < width; x++) {
                double dx = x - hotX;
                double dy = y - hotY;
                double dist = Math.sqrt(dx * dx + dy * dy);
                // current density: low base + gaussian peak at hot spot
                double v = 0.05 + 0.95 * Math.exp(-(dist * dist) / 12.0);
                v = Math.round(v * 1000.0) / 1000.0;
                row.add(v);
                sum += v;
                if (v > max) max = v;
            }
            grid.add(row);
        }

        return ConnectivityResponse.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .resolution("100m")
            .engine(engine)
            .gridWidth(width)
            .gridHeight(height)
            .meanCurrentDensity(Math.round(sum / (width * height) * 1000.0) / 1000.0)
            .maxCurrentDensity(max)
            .currentDensityGrid(grid)
            .status("STUB")
            .message("Synthetic current-density grid. Real implementation shells out to Circuitscape (Julia) or Omniscape with the resistance raster + source/destination patches as inputs.")
            .build();
    }
}
