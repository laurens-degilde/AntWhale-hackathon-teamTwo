package com.corridorapi.service;

import com.corridorapi.model.response.BrtBgtResponse;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * BRT (Basisregistratie Topografie) and BGT (Basisregistratie Grootschalige Topografie).
 *
 * STUB. Live wiring should call PDOK:
 *   - BRT TOP10NL WFS:  https://service.pdok.nl/brt/top10nl/wfs/v1_0
 *   - BGT WFS:          https://service.pdok.nl/lv/bgt/wfs/v1_0
 * For BGT you typically want feature types: pand, wegdeel, waterdeel,
 * begroeidterreindeel, onbegroeidterreindeel, scheiding (fences/walls/hedges),
 * spoor, overigbouwwerk.
 */
@Service
public class BrtBgtService {

    public BrtBgtResponse fetch(double[] bbox, String dataset) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        if ("BGT".equalsIgnoreCase(dataset)) {
            counts.put("pand", 1284);
            counts.put("wegdeel", 412);
            counts.put("waterdeel", 67);
            counts.put("begroeidterreindeel", 318);
            counts.put("onbegroeidterreindeel", 154);
            counts.put("scheiding", 211);   // fences, walls, hedges
            counts.put("spoor", 8);
        } else {
            counts.put("wegdeel", 287);
            counts.put("waterdeel", 41);
            counts.put("gebouw", 902);
            counts.put("terrein", 173);
            counts.put("functioneelgebied", 24);
        }

        Map<String, Object> features = new LinkedHashMap<>();
        features.put("type", "FeatureCollection");
        features.put("features", List.of());   // real impl would emit actual polygons

        String service = "BGT".equalsIgnoreCase(dataset)
            ? "https://service.pdok.nl/lv/bgt/wfs/v1_0"
            : "https://service.pdok.nl/brt/top10nl/wfs/v1_0";

        return BrtBgtResponse.builder()
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .dataset(dataset.toUpperCase())
            .pdokService(service)
            .featureCounts(counts)
            .features(features)
            .source("pdok")
            .status("STUB")
            .build();
    }
}
