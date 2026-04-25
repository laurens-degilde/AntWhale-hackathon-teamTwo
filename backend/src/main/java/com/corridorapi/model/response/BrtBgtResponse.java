package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

@Value
@Builder
public class BrtBgtResponse {
    List<Double> bbox;
    String dataset;             // BRT_TOP10NL or BGT
    /** PDOK service URL the live implementation would call. */
    String pdokService;
    /** Per-feature-class summary counts within the bbox. */
    Map<String, Integer> featureCounts;
    /** GeoJSON FeatureCollection of sampled features (stub returns a small set). */
    Map<String, Object> features;
    String source;
    String status;
}
