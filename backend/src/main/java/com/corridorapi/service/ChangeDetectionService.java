package com.corridorapi.service;

import com.corridorapi.model.request.ChangeDetectionRequest;
import com.corridorapi.model.request.RegionSnapshot;
import com.corridorapi.model.response.ChangeDetectionResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ChangeDetectionService {

    private static final double LAND_COVER_DELTA_THRESHOLD = 0.5; // pct points

    public ChangeDetectionResponse diff(ChangeDetectionRequest req) {
        RegionSnapshot prev = req.getPrevious();
        RegionSnapshot curr = req.getCurrent();

        List<ChangeDetectionResponse.RoadkillCluster> newClusters = new ArrayList<>();
        Set<String> prevIds = new HashSet<>();
        if (prev.getRoadkillPoints() != null) {
            for (RegionSnapshot.RoadkillPoint p : prev.getRoadkillPoints()) {
                if (p.getId() != null) prevIds.add(p.getId());
            }
        }
        if (curr.getRoadkillPoints() != null) {
            for (RegionSnapshot.RoadkillPoint p : curr.getRoadkillPoints()) {
                if (p.getId() != null && !prevIds.contains(p.getId())) {
                    newClusters.add(ChangeDetectionResponse.RoadkillCluster.builder()
                        .id(p.getId())
                        .lat(p.getLat())
                        .lng(p.getLng())
                        .observedOn(p.getObservedOn())
                        .build());
                }
            }
        }

        List<ChangeDetectionResponse.LandCoverShift> shifts = new ArrayList<>();
        Map<String, Double> prevLC = prev.getLandCoverPct() != null ? prev.getLandCoverPct() : Map.of();
        Map<String, Double> currLC = curr.getLandCoverPct() != null ? curr.getLandCoverPct() : Map.of();
        Set<String> classes = new HashSet<>();
        classes.addAll(prevLC.keySet());
        classes.addAll(currLC.keySet());
        for (String klass : classes) {
            double pPct = prevLC.getOrDefault(klass, 0.0);
            double cPct = currLC.getOrDefault(klass, 0.0);
            double delta = cPct - pPct;
            if (Math.abs(delta) >= LAND_COVER_DELTA_THRESHOLD) {
                shifts.add(ChangeDetectionResponse.LandCoverShift.builder()
                    .landCoverClass(klass)
                    .previousPct(pPct)
                    .currentPct(cPct)
                    .deltaPct(Math.round(delta * 100.0) / 100.0)
                    .build());
            }
        }

        Integer newBuildings = null;
        if (prev.getOsmBuildingCount() != null && curr.getOsmBuildingCount() != null) {
            newBuildings = Math.max(0, curr.getOsmBuildingCount() - prev.getOsmBuildingCount());
        }

        List<ChangeDetectionResponse.RankShift> rankShifts = new ArrayList<>();
        Map<String, Integer> prevRanks = rankMap(prev.getRankedPinchPointIds());
        Map<String, Integer> currRanks = rankMap(curr.getRankedPinchPointIds());
        Set<String> ids = new HashSet<>();
        ids.addAll(prevRanks.keySet());
        ids.addAll(currRanks.keySet());
        for (String id : ids) {
            Integer pRank = prevRanks.get(id);
            Integer cRank = currRanks.get(id);
            if (pRank == null || cRank == null || !pRank.equals(cRank)) {
                rankShifts.add(ChangeDetectionResponse.RankShift.builder()
                    .pinchPointId(id)
                    .previousRank(pRank)
                    .currentRank(cRank)
                    .delta(pRank != null && cRank != null ? pRank - cRank : null)
                    .build());
            }
        }

        List<String> amendments = new ArrayList<>();
        if (!newClusters.isEmpty()) {
            amendments.add("Add " + newClusters.size() + " new road-kill cluster(s) to the priority review; re-evaluate nearby pinch points.");
        }
        if (!shifts.isEmpty()) {
            amendments.add("Investigate " + shifts.size() + " land-cover shift(s) — possible new development or land-use conversion.");
        }
        if (newBuildings != null && newBuildings > 0) {
            amendments.add("OSM building count up by " + newBuildings + ". Re-check whether new development crosses any priority corridor.");
        }
        if (!rankShifts.isEmpty()) {
            amendments.add("Intervention ranking has shifted: " + rankShifts.size() + " pinch point(s) changed priority. Re-issue updated landowner-letter and subsidy bundles for affected parcels.");
        }
        if (amendments.isEmpty()) {
            amendments.add("No material change detected; existing plan remains current.");
        }

        return ChangeDetectionResponse.builder()
            .previousTakenAt(prev.getTakenAt())
            .currentTakenAt(curr.getTakenAt())
            .newRoadkillClusters(newClusters)
            .landUseChanges(shifts)
            .newBuildingCount(newBuildings)
            .rankingShifts(rankShifts)
            .planAmendments(amendments)
            .status("STUB")
            .build();
    }

    private static Map<String, Integer> rankMap(List<String> ids) {
        Map<String, Integer> out = new HashMap<>();
        if (ids == null) return out;
        for (int i = 0; i < ids.size(); i++) {
            out.put(ids.get(i), i + 1);
        }
        return out;
    }
}
