package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

@Value
@Builder
public class ChangeDetectionResponse {
    String previousTakenAt;
    String currentTakenAt;
    /** Roadkill records present in current but not in previous (treated as new clusters). */
    List<RoadkillCluster> newRoadkillClusters;
    /** Land-cover classes whose pct shifted by ≥ threshold. */
    List<LandCoverShift> landUseChanges;
    /** Indicative metric: increase in OSM building count across snapshots. */
    Integer newBuildingCount;
    /** Pinch-point IDs that moved up or down in priority. */
    List<RankShift> rankingShifts;
    /** Plain-text bullets the caller can fold into a plan-amendment document. */
    List<String> planAmendments;
    String status;

    @Value
    @Builder
    public static class RoadkillCluster {
        String id;
        Double lat;
        Double lng;
        String observedOn;
    }

    @Value
    @Builder
    public static class LandCoverShift {
        String landCoverClass;
        Double previousPct;
        Double currentPct;
        Double deltaPct;
    }

    @Value
    @Builder
    public static class RankShift {
        String pinchPointId;
        Integer previousRank;
        Integer currentRank;
        Integer delta;
    }
}
