package com.corridorapi.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
public class OsmFeaturesService {

    private static final long LARGE_RESPONSE_BYTES = 5L * 1024 * 1024;
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<>() {};

    private static final Set<String> SUPPORTED = Set.of(
        "roads", "waterways", "buildings", "landuse", "fences"
    );

    private final WebClient overpass;

    public OsmFeaturesService(@Qualifier("overpassWebClient") WebClient overpass) {
        this.overpass = overpass;
    }

    public Map<String, Object> fetch(String bboxOverpassOrder, List<String> featureTypes) {
        for (String f : featureTypes) {
            if (!SUPPORTED.contains(f)) {
                throw new IllegalArgumentException(
                    "Unsupported featureType '" + f + "'. Allowed: " + SUPPORTED);
            }
        }
        String[] parts = bboxOverpassOrder.split(",");
        if (parts.length != 4) {
            throw new IllegalArgumentException("bbox must be 'south,west,north,east'");
        }
        try {
            for (String p : parts) Double.parseDouble(p.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("bbox values must be numeric");
        }
        String bboxClause = "(" + String.join(",", parts) + ")";

        String query = buildQuery(bboxClause, featureTypes);
        log.info("Overpass QL ({} chars): {}", query.length(), query.replace("\n", " "));

        Map<String, Object> raw = overpass.post()
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData("data", query))
            .retrieve()
            .bodyToMono(MAP_TYPE)
            .block();

        long approxSize = approximateSize(raw);
        Map<String, Object> fc = toFeatureCollection(raw, featureTypes);
        if (approxSize > LARGE_RESPONSE_BYTES) {
            fc.put("warning", "response_large");
        }
        return fc;
    }

    static String buildQuery(String bboxClause, List<String> featureTypes) {
        StringBuilder sb = new StringBuilder("[out:json][timeout:60];\n(\n");
        for (String t : featureTypes) {
            switch (t) {
                case "roads" -> sb.append("  way[\"highway\"]").append(bboxClause).append(";\n");
                case "waterways" -> {
                    sb.append("  way[\"waterway\"]").append(bboxClause).append(";\n");
                    sb.append("  relation[\"waterway\"]").append(bboxClause).append(";\n");
                }
                case "buildings" -> sb.append("  way[\"building\"]").append(bboxClause).append(";\n");
                case "landuse" -> {
                    sb.append("  way[\"landuse\"]").append(bboxClause).append(";\n");
                    sb.append("  relation[\"landuse\"]").append(bboxClause).append(";\n");
                }
                case "fences" -> sb.append("  way[\"barrier\"~\"fence|wall|hedge\"]").append(bboxClause).append(";\n");
            }
        }
        sb.append(");\nout body geom;\n");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toFeatureCollection(Map<String, Object> raw, List<String> featureTypes) {
        List<Map<String, Object>> features = new ArrayList<>();
        if (raw != null && raw.get("elements") instanceof List<?> els) {
            for (Object e : els) {
                if (!(e instanceof Map<?, ?> rawMap)) continue;
                Map<String, Object> m = (Map<String, Object>) rawMap;
                Map<String, Object> tags = (Map<String, Object>) m.getOrDefault("tags", Map.of());
                String osmType = classify(tags, featureTypes);
                Map<String, Object> geom = buildGeometry(m);
                if (geom == null) continue;

                Map<String, Object> properties = new LinkedHashMap<>(tags);
                properties.put("osm_id", m.get("id"));
                properties.put("osm_element", m.get("type"));
                properties.put("osm_feature_type", osmType);

                Map<String, Object> feature = new LinkedHashMap<>();
                feature.put("type", "Feature");
                feature.put("id", m.get("type") + "/" + m.get("id"));
                feature.put("geometry", geom);
                feature.put("properties", properties);
                features.add(feature);
            }
        }
        Map<String, Object> fc = new LinkedHashMap<>();
        fc.put("type", "FeatureCollection");
        fc.put("featureCount", features.size());
        fc.put("featureTypes", featureTypes);
        fc.put("features", features);
        return fc;
    }

    private static String classify(Map<String, Object> tags, List<String> requested) {
        if (tags.containsKey("highway")) return "roads";
        if (tags.containsKey("waterway")) return "waterways";
        if (tags.containsKey("building")) return "buildings";
        if (tags.containsKey("landuse")) return "landuse";
        if (tags.containsKey("barrier")) return "fences";
        return requested.isEmpty() ? "unknown" : requested.get(0);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> buildGeometry(Map<String, Object> el) {
        Object type = el.get("type");
        if ("node".equals(type)) {
            Object lat = el.get("lat");
            Object lon = el.get("lon");
            if (lat == null || lon == null) return null;
            return Map.of(
                "type", "Point",
                "coordinates", List.of(((Number) lon).doubleValue(), ((Number) lat).doubleValue())
            );
        }
        if ("way".equals(type)) {
            Object g = el.get("geometry");
            if (!(g instanceof List<?> pts)) return null;
            List<List<Double>> coords = pts.stream()
                .map(o -> (Map<String, Object>) o)
                .map(p -> List.of(((Number) p.get("lon")).doubleValue(), ((Number) p.get("lat")).doubleValue()))
                .collect(Collectors.toList());
            if (coords.size() < 2) return null;
            boolean closed = coords.get(0).equals(coords.get(coords.size() - 1));
            return Map.of(
                "type", closed ? "Polygon" : "LineString",
                "coordinates", closed ? List.of(coords) : coords
            );
        }
        // relations: skip — would need recursive member assembly. Tags still preserved if needed later.
        return null;
    }

    private static long approximateSize(Map<String, Object> raw) {
        if (raw == null) return 0;
        if (raw.get("elements") instanceof List<?> els) {
            // rough estimate: ~250 bytes per element
            return (long) els.size() * 250L;
        }
        return 0;
    }
}
