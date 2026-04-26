package com.corridorapi.service;

import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Rasterises OSM vector features into a per-cell land-cover label grid.
 *
 * Pipeline:
 *   1. Pull landuse / natural / highway / barrier features from OsmFeaturesService.
 *   2. Initialise an N×M grid with the regional default class (agricultural_field).
 *   3. Stamp polygons (forest, water, urban, wetland) using ray-cast point-in-polygon
 *      across each polygon's pixel-space bounding box.
 *   4. Overlay linear features (fences, then roads) — these slice through and override
 *      the underlying polygon class because that's what they do to a real animal.
 *
 * The output land-cover labels match the keys ResistanceSurfaceService already uses
 * (forest / agricultural_field / urban / wetland / hedgerow / secondary_road / highway / fence_line),
 * so the resistance lookup is a one-step join with no class translation required.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OsmRasteriserService {

    private static final String DEFAULT_CLASS = "agricultural_field";

    private final OsmFeaturesService osmFeatures;

    @Value
    public static class LandCoverGrid {
        double[] bbox;          // minLng, minLat, maxLng, maxLat
        int width;
        int height;
        String[][] cells;       // [row=y][col=x], y=0 is top (north)
    }

    /**
     * Bbox area (deg²) above which we skip individual building footprints from the Overpass query.
     * Building polygons dominate response size in dense areas — a 25 km × 15 km bbox in NL can
     * exceed 128 MB just from buildings — and at 64×64 resolution each grid cell is ~250–600m
     * wide, so individual buildings are sub-pixel anyway. The `landuse=residential` polygons
     * we still fetch are enough to mark urban cells at this resolution.
     */
    private static final double DROP_BUILDINGS_AREA_DEG2 = 0.02;

    public LandCoverGrid rasterise(double[] bbox, int width, int height) {
        double minLng = bbox[0], minLat = bbox[1], maxLng = bbox[2], maxLat = bbox[3];
        double areaDeg2 = (maxLng - minLng) * (maxLat - minLat);
        boolean includeBuildings = areaDeg2 <= DROP_BUILDINGS_AREA_DEG2;

        List<String> featureTypes = includeBuildings
            ? List.of("landuse", "waterways", "roads", "fences", "buildings")
            : List.of("landuse", "waterways", "roads", "fences");
        if (!includeBuildings) {
            log.info("Bbox area {} deg² > {} — skipping buildings to keep response under buffer limit",
                String.format("%.4f", areaDeg2), DROP_BUILDINGS_AREA_DEG2);
        }

        // OsmFeaturesService takes Overpass-order: south,west,north,east
        String overpassBbox = String.format("%f,%f,%f,%f", minLat, minLng, maxLat, maxLng);
        Map<String, Object> fc = osmFeatures.fetch(overpassBbox, featureTypes);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> features = (List<Map<String, Object>>) fc.getOrDefault("features", List.of());
        log.info("Rasterising {} OSM features into {}×{} grid", features.size(), width, height);

        String[][] cells = new String[height][width];
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) cells[y][x] = DEFAULT_CLASS;
        }

        // Pass 1: polygons. Stamp lower-priority first; later polygons overwrite earlier
        // ones on overlap (e.g. a water polygon inside a forest polygon stays water).
        // Order: forest → wetland → urban → water  (water last because it's the strongest).
        stampPolygons(features, "forest", cells, width, height, bbox);
        stampPolygons(features, "wetland", cells, width, height, bbox);
        stampPolygons(features, "urban", cells, width, height, bbox);
        stampPolygons(features, "water_polygon", cells, width, height, bbox);

        // Pass 2: linear features. Fences first, then roads — roads are the strongest barrier
        // and should win where they cross a hedgerow or a small waterway tagged as a line.
        stampLines(features, cells, width, height, bbox);

        return new LandCoverGrid(bbox, width, height, cells);
    }

    private static void stampPolygons(
            List<Map<String, Object>> features, String targetClass,
            String[][] cells, int width, int height, double[] bbox) {
        for (Map<String, Object> f : features) {
            Map<String, Object> geom = geometry(f);
            if (geom == null || !"Polygon".equals(geom.get("type"))) continue;
            String klass = classifyPolygon(properties(f));
            if (klass == null || !klass.equals(targetClass)) continue;

            List<List<List<Double>>> rings = coords3(geom);
            if (rings.isEmpty()) continue;
            List<List<Double>> outer = rings.get(0);
            stampRing(outer, klass.equals("water_polygon") ? "wetland" : klass, cells, width, height, bbox);
        }
    }

    private static void stampLines(
            List<Map<String, Object>> features,
            String[][] cells, int width, int height, double[] bbox) {
        // First fences/hedges, then roads (roads override fences on overlap).
        for (int phase = 0; phase < 2; phase++) {
            boolean roadPhase = (phase == 1);
            for (Map<String, Object> f : features) {
                Map<String, Object> geom = geometry(f);
                if (geom == null || !"LineString".equals(geom.get("type"))) continue;
                Map<String, Object> props = properties(f);
                String klass = classifyLine(props);
                if (klass == null) continue;
                boolean isRoad = klass.equals("highway") || klass.equals("secondary_road");
                if (isRoad != roadPhase) continue;

                List<List<Double>> line = coords2(geom);
                stampPolyline(line, klass, cells, width, height, bbox);
            }
        }
    }

    /** OSM polygon → our resistance class. Returns null if not relevant. */
    private static String classifyPolygon(Map<String, Object> props) {
        // Any feature carrying a `building=*` tag is a building footprint regardless of value
        // (`yes`, `house`, `industrial`, `barn`, …). Resistance-wise it behaves like urban,
        // so we fold it into the urban class — the cell is impermeable infrastructure either way.
        if (props.get("building") != null) return "urban";
        Object landuse = props.get("landuse");
        Object natural = props.get("natural");
        if ("forest".equals(landuse) || "wood".equals(natural)) return "forest";
        if ("residential".equals(landuse) || "commercial".equals(landuse) || "industrial".equals(landuse))
            return "urban";
        if ("water".equals(natural) || "basin".equals(landuse) || "reservoir".equals(landuse))
            return "water_polygon"; // routed to wetland resistance
        if ("wetland".equals(natural) || "wetland".equals(landuse)) return "wetland";
        if ("farmland".equals(landuse) || "meadow".equals(landuse) || "pasture".equals(landuse)
                || "orchard".equals(landuse)) return "agricultural_field";
        return null;
    }

    /** OSM linear feature → our resistance class. Returns null if not relevant. */
    private static String classifyLine(Map<String, Object> props) {
        Object highway = props.get("highway");
        if (highway != null) {
            String h = highway.toString();
            if (h.equals("motorway") || h.equals("trunk") || h.equals("primary")) return "highway";
            if (h.equals("secondary") || h.equals("tertiary") || h.equals("unclassified")
                    || h.equals("residential")) return "secondary_road";
            return null; // service / track / footway — not a meaningful barrier
        }
        Object barrier = props.get("barrier");
        if ("hedge".equals(barrier)) return "hedgerow";
        if ("fence".equals(barrier) || "wall".equals(barrier)) return "fence_line";
        return null;
    }

    /** Ray-cast fill a polygon ring into the grid in pixel space. */
    private static void stampRing(
            List<List<Double>> ring, String klass,
            String[][] cells, int width, int height, double[] bbox) {
        if (ring.size() < 3) return;
        int n = ring.size();
        double[] px = new double[n];
        double[] py = new double[n];
        double minX = width, maxX = -1, minY = height, maxY = -1;
        for (int i = 0; i < n; i++) {
            double[] xy = lonLatToPixel(ring.get(i).get(0), ring.get(i).get(1), bbox, width, height);
            px[i] = xy[0]; py[i] = xy[1];
            if (xy[0] < minX) minX = xy[0];
            if (xy[0] > maxX) maxX = xy[0];
            if (xy[1] < minY) minY = xy[1];
            if (xy[1] > maxY) maxY = xy[1];
        }
        int x0 = Math.max(0, (int) Math.floor(minX));
        int x1 = Math.min(width - 1, (int) Math.ceil(maxX));
        int y0 = Math.max(0, (int) Math.floor(minY));
        int y1 = Math.min(height - 1, (int) Math.ceil(maxY));

        for (int y = y0; y <= y1; y++) {
            double cy = y + 0.5;
            for (int x = x0; x <= x1; x++) {
                double cx = x + 0.5;
                if (pointInRing(cx, cy, px, py)) {
                    cells[y][x] = klass;
                }
            }
        }
    }

    /** Stamp a polyline using a supercover-style DDA across (x,y) pixel space. */
    private static void stampPolyline(
            List<List<Double>> line, String klass,
            String[][] cells, int width, int height, double[] bbox) {
        if (line.size() < 2) return;
        for (int i = 0; i < line.size() - 1; i++) {
            double[] a = lonLatToPixel(line.get(i).get(0), line.get(i).get(1), bbox, width, height);
            double[] b = lonLatToPixel(line.get(i + 1).get(0), line.get(i + 1).get(1), bbox, width, height);
            stampSegment(a[0], a[1], b[0], b[1], klass, cells, width, height);
        }
    }

    private static void stampSegment(
            double x0, double y0, double x1, double y1, String klass,
            String[][] cells, int width, int height) {
        double dx = x1 - x0;
        double dy = y1 - y0;
        double steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps < 1e-9) {
            paint((int) Math.floor(x0), (int) Math.floor(y0), klass, cells, width, height);
            return;
        }
        double sx = dx / steps;
        double sy = dy / steps;
        double cx = x0;
        double cy = y0;
        int n = (int) Math.ceil(steps) + 1;
        for (int i = 0; i < n; i++) {
            paint((int) Math.floor(cx), (int) Math.floor(cy), klass, cells, width, height);
            cx += sx;
            cy += sy;
        }
    }

    private static void paint(int x, int y, String klass, String[][] cells, int width, int height) {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        cells[y][x] = klass;
    }

    /** Ray-casting: count ring crossings of a horizontal ray to the right of (x,y). */
    private static boolean pointInRing(double x, double y, double[] px, double[] py) {
        boolean inside = false;
        int n = px.length;
        for (int i = 0, j = n - 1; i < n; j = i++) {
            double yi = py[i], yj = py[j];
            if ((yi > y) != (yj > y)) {
                double xi = px[i], xj = px[j];
                double xCross = xi + (y - yi) * (xj - xi) / (yj - yi);
                if (x < xCross) inside = !inside;
            }
        }
        return inside;
    }

    /**
     * Equirectangular projection — exact at the chosen latitude, fine for ≤ ~50 km bboxes.
     * y=0 is the top (north), so we flip latitude.
     */
    private static double[] lonLatToPixel(double lng, double lat, double[] bbox, int width, int height) {
        double minLng = bbox[0], minLat = bbox[1], maxLng = bbox[2], maxLat = bbox[3];
        double x = (lng - minLng) / (maxLng - minLng) * width;
        double y = (maxLat - lat) / (maxLat - minLat) * height;
        return new double[]{x, y};
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> geometry(Map<String, Object> feature) {
        return (Map<String, Object>) feature.get("geometry");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> properties(Map<String, Object> feature) {
        Object p = feature.get("properties");
        return p instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    @SuppressWarnings("unchecked")
    private static List<List<Double>> coords2(Map<String, Object> geom) {
        Object c = geom.get("coordinates");
        if (!(c instanceof List<?> list)) return List.of();
        List<List<Double>> out = new ArrayList<>(list.size());
        for (Object pt : list) {
            if (pt instanceof List<?> p && p.size() >= 2) {
                out.add(List.of(((Number) p.get(0)).doubleValue(), ((Number) p.get(1)).doubleValue()));
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static List<List<List<Double>>> coords3(Map<String, Object> geom) {
        Object c = geom.get("coordinates");
        if (!(c instanceof List<?> rings)) return List.of();
        List<List<List<Double>>> out = new ArrayList<>(rings.size());
        for (Object ring : rings) {
            if (!(ring instanceof List<?> pts)) continue;
            List<List<Double>> r = new ArrayList<>(pts.size());
            for (Object pt : pts) {
                if (pt instanceof List<?> p && p.size() >= 2) {
                    r.add(List.of(((Number) p.get(0)).doubleValue(), ((Number) p.get(1)).doubleValue()));
                }
            }
            out.add(r);
        }
        return out;
    }
}
