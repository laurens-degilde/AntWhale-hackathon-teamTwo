package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PinchPoint {
    String id;
    GeoPoint location;
    Double currentDensity;            // higher = more bottlenecked
    Double bottleneckScore;           // 0-1 normalised priority
    String dominantLandCoverAtPoint;  // e.g. "highway" — drives intervention type
    String betweenPatches;            // human-readable e.g. "patch-1 ↔ patch-2"
}
