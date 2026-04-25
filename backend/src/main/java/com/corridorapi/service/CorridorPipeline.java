package com.corridorapi.service;

import com.corridorapi.enums.SpeciesType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Composes the real corridor-analysis pipeline:
 *   bbox + species
 *     -> OSM rasterised to per-cell land-cover labels
 *     -> per-species resistance coefficients applied per cell
 *     -> connected components of low-resistance cells = habitat patches
 *     -> centroid of each patch = focal node
 *     -> Circuitscape pairwise current-density across all focal-node pairs.
 *
 * Both ConnectivityService and PinchPointService share this output so the same
 * resistance grid and current-density raster back the heat-map and the pinch-point
 * card. (No caching here yet — concurrent requests for the same bbox each pay the
 * Circuitscape run; a Caffeine cache around `compute` is the obvious next step.)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CorridorPipeline {

    @Value("${corridor.grid-size:64}")
    private int gridSize;

    @Value("${corridor.habitat-resistance-threshold:5.0}")
    private double habitatThreshold;

    @Value("${corridor.min-patch-cells:5}")
    private int minPatchCells;

    @Value("${corridor.max-focal-nodes:8}")
    private int maxFocalNodes;

    @Value("${corridor.cache-ttl-seconds:120}")
    private int cacheTtlSeconds;

    private final OsmRasteriserService rasteriser;
    private final ResistanceSurfaceService resistanceService;
    private final CircuitscapeRunner circuitscape;

    /**
     * Per-(species, bbox) memoization. The frontend fires connectivity, pinch-points, and
     * habitat-patches in parallel for a single bbox selection; without a cache, that's three
     * back-to-back Overpass calls (often tripping its 429 fair-use limit) and three Circuitscape
     * solves. With this cache one selection = one Overpass call + one Circuitscape solve.
     */
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Object> locks = new ConcurrentHashMap<>();

    private record CacheEntry(Instant timestamp, Output output) {}

    public record Patch(
            String id,
            int centroidX,
            int centroidY,
            int cellCount,
            String dominantLandCover) {}

    public record Output(
            SpeciesType species,
            double[] bbox,
            int width,
            int height,
            OsmRasteriserService.LandCoverGrid landCover,
            double[][] resistance,
            List<Patch> patches,
            CircuitscapeRunner.Result circuit) {}

    public Output compute(SpeciesType species, double[] bbox) throws IOException, InterruptedException {
        String key = cacheKey(species, bbox);
        CacheEntry hit = cache.get(key);
        if (isFresh(hit)) {
            log.debug("CorridorPipeline cache hit for {}", key);
            return hit.output();
        }
        // Per-key lock so two concurrent requests for the same bbox share one computation.
        Object lock = locks.computeIfAbsent(key, k -> new Object());
        synchronized (lock) {
            hit = cache.get(key);
            if (isFresh(hit)) return hit.output();
            Output computed = doCompute(species, bbox);
            cache.put(key, new CacheEntry(Instant.now(), computed));
            sweepStale();
            return computed;
        }
    }

    private Output doCompute(SpeciesType species, double[] bbox) throws IOException, InterruptedException {
        OsmRasteriserService.LandCoverGrid lc = rasteriser.rasterise(bbox, gridSize, gridSize);
        Map<String, Double> coeff = resistanceService.coefficientMap(species);
        double[][] resistance = applyCoefficients(lc, coeff);
        List<Patch> patches = findPatches(resistance, lc);

        if (patches.size() < 2) {
            throw new IllegalStateException(
                "Found " + patches.size() + " habitat patch(es) for " + species.getKey()
                + " in bbox — need at least 2 to compute connectivity. "
                + "Try a larger bbox, or pick a species with broader habitat tolerance.");
        }

        List<CircuitscapeRunner.FocalNode> focals = patches.stream()
            .limit(maxFocalNodes)
            .map(p -> new CircuitscapeRunner.FocalNode(p.id(), p.centroidX(), p.centroidY()))
            .toList();

        log.info("Running Circuitscape for {} on {}×{} grid with {} focal nodes",
            species.getKey(), gridSize, gridSize, focals.size());
        CircuitscapeRunner.Result result = circuitscape.run(resistance, focals);

        return new Output(species, bbox, gridSize, gridSize, lc, resistance, patches, result);
    }

    private boolean isFresh(CacheEntry e) {
        return e != null && Duration.between(e.timestamp(), Instant.now()).getSeconds() < cacheTtlSeconds;
    }

    private void sweepStale() {
        Instant cutoff = Instant.now().minusSeconds(cacheTtlSeconds);
        cache.entrySet().removeIf(en -> en.getValue().timestamp().isBefore(cutoff));
        if (cache.isEmpty()) locks.clear();
    }

    private static String cacheKey(SpeciesType species, double[] bbox) {
        return species.getKey() + "|" + Arrays.toString(bbox);
    }

    private static double[][] applyCoefficients(OsmRasteriserService.LandCoverGrid lc, Map<String, Double> coeff) {
        int h = lc.getHeight();
        int w = lc.getWidth();
        String[][] cells = lc.getCells();
        double[][] out = new double[h][w];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                String klass = cells[y][x];
                Double v = coeff.get(klass);
                // Unmapped class → fall back to agricultural_field's value, or 50 if missing.
                if (v == null) v = coeff.getOrDefault("agricultural_field", 50.0);
                out[y][x] = v;
            }
        }
        return out;
    }

    /** BFS connected components of cells with resistance ≤ habitatThreshold. */
    private List<Patch> findPatches(double[][] resistance, OsmRasteriserService.LandCoverGrid lc) {
        int h = resistance.length;
        int w = resistance[0].length;
        boolean[][] visited = new boolean[h][w];
        int[] dx = {-1, 1, 0, 0};
        int[] dy = {0, 0, -1, 1};
        List<Patch> patches = new ArrayList<>();
        int patchIdx = 0;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (visited[y][x]) continue;
                if (resistance[y][x] > habitatThreshold) continue;
                Deque<int[]> queue = new ArrayDeque<>();
                queue.add(new int[]{x, y});
                visited[y][x] = true;
                int sumX = 0, sumY = 0, count = 0;
                Map<String, Integer> classCounts = new java.util.HashMap<>();
                while (!queue.isEmpty()) {
                    int[] cell = queue.pop();
                    int cx = cell[0], cy = cell[1];
                    sumX += cx;
                    sumY += cy;
                    count++;
                    classCounts.merge(lc.getCells()[cy][cx], 1, Integer::sum);
                    for (int k = 0; k < 4; k++) {
                        int nx = cx + dx[k], ny = cy + dy[k];
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                        if (visited[ny][nx]) continue;
                        if (resistance[ny][nx] > habitatThreshold) continue;
                        visited[ny][nx] = true;
                        queue.add(new int[]{nx, ny});
                    }
                }
                if (count >= minPatchCells) {
                    int cx = sumX / count;
                    int cy = sumY / count;
                    // ensure the centroid sits on a habitat cell — if not, walk to nearest in the same component
                    int[] anchor = nearestHabitatCellInPatch(resistance, lc, cx, cy);
                    if (anchor == null) anchor = new int[]{cx, cy};
                    String dominant = classCounts.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse("unknown");
                    patches.add(new Patch("patch-" + (++patchIdx), anchor[0], anchor[1], count, dominant));
                }
            }
        }
        // Order by descending size — the maxFocalNodes cap then keeps the most ecologically significant.
        patches.sort(Comparator.comparingInt(Patch::cellCount).reversed());
        // Re-id 1..N for human readability.
        List<Patch> renamed = new ArrayList<>(patches.size());
        for (int i = 0; i < patches.size(); i++) {
            Patch p = patches.get(i);
            renamed.add(new Patch("patch-" + (i + 1), p.centroidX(), p.centroidY(), p.cellCount(), p.dominantLandCover()));
        }
        return renamed;
    }

    private int[] nearestHabitatCellInPatch(double[][] resistance, OsmRasteriserService.LandCoverGrid lc,
                                            int cx, int cy) {
        int h = resistance.length;
        int w = resistance[0].length;
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) return null;
        if (resistance[cy][cx] <= habitatThreshold) return new int[]{cx, cy};
        // expanding ring search
        int maxR = Math.max(w, h);
        for (int r = 1; r < maxR; r++) {
            for (int dy = -r; dy <= r; dy++) {
                for (int dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) != r) continue;
                    int nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                    if (resistance[ny][nx] <= habitatThreshold) return new int[]{nx, ny};
                }
            }
        }
        return null;
    }
}
