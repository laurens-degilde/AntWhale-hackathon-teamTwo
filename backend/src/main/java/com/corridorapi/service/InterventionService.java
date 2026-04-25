package com.corridorapi.service;

import com.corridorapi.enums.InterventionType;
import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.Intervention;
import com.corridorapi.model.response.InterventionResponse;
import com.corridorapi.model.response.PinchPoint;
import com.corridorapi.model.response.PinchPointResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Classifies pinch points into intervention archetypes and ranks them by
 * cost-effectiveness. STUB: real implementation re-runs Circuitscape with each
 * candidate intervention "in place" (i.e. resistance for that pixel reduced)
 * and measures the delta in current density to populate connectivityBenefit.
 */
@Service
public class InterventionService {

    private final PinchPointService pinchPointService;

    public InterventionService(PinchPointService pinchPointService) {
        this.pinchPointService = pinchPointService;
    }

    public InterventionResponse classify(SpeciesType species, double[] bbox, int topN) {
        PinchPointResponse pp = pinchPointService.identify(species, bbox, topN);

        List<Intervention> raw = new ArrayList<>();
        for (PinchPoint p : pp.getPinchPoints()) {
            InterventionType type = pickInterventionType(p.getDominantLandCoverAtPoint(), species);

            // Synthetic but plausible: scale connectivity benefit by the pinch's bottleneckScore.
            double benefit = Math.round(p.getBottleneckScore() * 100.0) / 100.0;
            double midCost = (type.getMinCostEur() + type.getMaxCostEur()) / 2.0;
            double costEff = Math.round((benefit / midCost) * 1_000_000.0) / 1_000_000.0;

            raw.add(Intervention.builder()
                .id("int-" + p.getId().replace("pp-", ""))
                .pinchPointId(p.getId())
                .type(type)
                .location(p.getLocation())
                .minCostEur(type.getMinCostEur())
                .maxCostEur(type.getMaxCostEur())
                .costNote(costUnitNote(type))
                .connectivityBenefit(benefit)
                .costEffectivenessScore(costEff)
                .description(type.getDescription())
                .build());
        }

        // Rank by cost-effectiveness (higher score wins).
        raw.sort(Comparator.comparingDouble(Intervention::getCostEffectivenessScore).reversed());
        List<Intervention> ranked = new ArrayList<>(raw.size());
        for (int i = 0; i < raw.size(); i++) {
            Intervention orig = raw.get(i);
            ranked.add(Intervention.builder()
                .id(orig.getId())
                .pinchPointId(orig.getPinchPointId())
                .type(orig.getType())
                .location(orig.getLocation())
                .minCostEur(orig.getMinCostEur())
                .maxCostEur(orig.getMaxCostEur())
                .costNote(orig.getCostNote())
                .connectivityBenefit(orig.getConnectivityBenefit())
                .costEffectivenessScore(orig.getCostEffectivenessScore())
                .rank(i + 1)
                .description(orig.getDescription())
                .build());
        }

        return InterventionResponse.builder()
            .species(species.getKey())
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .methodology("Per pinch point: classify by dominant land cover at the bottleneck → pick archetype matched to species body size and movement mode → cost range from MJPO/LIFE post-completion budgets → connectivity benefit = predicted uplift in current density when the intervention is added → rank = benefit / mid-cost.")
            .interventions(ranked)
            .status("STUB")
            .build();
    }

    private InterventionType pickInterventionType(String landCover, SpeciesType species) {
        if (landCover == null) return InterventionType.HEDGEROW_PLANTING;
        return switch (landCover) {
            case "highway" -> switch (species) {
                case RED_DEER -> InterventionType.ECODUCT;
                case BADGER, OTTER, PINE_MARTEN -> InterventionType.WILDLIFE_UNDERPASS;
                case GREAT_CRESTED_NEWT -> InterventionType.AMPHIBIAN_TUNNEL;
                case HAZEL_DORMOUSE -> InterventionType.ECODUCT; // dormouse needs canopy-bridge / vegetated overpass
            };
            case "secondary_road" -> switch (species) {
                case RED_DEER -> InterventionType.WILDLIFE_UNDERPASS;
                case GREAT_CRESTED_NEWT -> InterventionType.AMPHIBIAN_TUNNEL;
                default -> InterventionType.SMALL_MAMMAL_CULVERT;
            };
            case "agricultural_field" -> switch (species) {
                case GREAT_CRESTED_NEWT -> InterventionType.STEPPING_STONE_POND;
                case HAZEL_DORMOUSE, BADGER, PINE_MARTEN -> InterventionType.HEDGEROW_PLANTING;
                default -> InterventionType.WILDFLOWER_STRIP;
            };
            case "fence_line" -> InterventionType.FENCE_MODIFICATION;
            default -> switch (species) {
                case GREAT_CRESTED_NEWT -> InterventionType.STEPPING_STONE_POND;
                case RED_DEER -> InterventionType.STEPPING_STONE_GRASSLAND;
                default -> InterventionType.STEPPING_STONE_WOODLAND;
            };
        };
    }

    private String costUnitNote(InterventionType t) {
        return switch (t) {
            case HEDGEROW_PLANTING -> "EUR per metre";
            case WILDFLOWER_STRIP -> "EUR per square metre";
            case FENCE_MODIFICATION, FENCE_REMOVAL -> "EUR per metre";
            case STEPPING_STONE_WOODLAND, STEPPING_STONE_GRASSLAND -> "EUR per hectare";
            case STEPPING_STONE_POND -> "EUR per pond";
            default -> "EUR total project cost";
        };
    }
}
