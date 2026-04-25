package com.corridorapi.model.request;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * A snapshot of the region the caller previously analysed. Stateless — the
 * caller persists their own snapshots and posts both prior + current here for
 * a diff. Anything the caller doesn't supply is treated as "unknown / no diff".
 */
@Data
public class RegionSnapshot {
    /** ISO-8601 timestamp when this snapshot was taken. */
    private String takenAt;
    /** [minLng, minLat, maxLng, maxLat]. */
    private List<Double> bbox;
    /** Map of land-cover class -> coverage percent for the bbox. */
    private Map<String, Double> landCoverPct;
    /** Roadkill point list — ids must be stable across snapshots. */
    private List<RoadkillPoint> roadkillPoints;
    /** Pinch-point ids in priority order at the time of this snapshot. */
    private List<String> rankedPinchPointIds;
    /** Number of OSM building features (proxy for new development). */
    private Integer osmBuildingCount;

    @Data
    public static class RoadkillPoint {
        private String id;
        private Double lat;
        private Double lng;
        private String observedOn;
    }
}
