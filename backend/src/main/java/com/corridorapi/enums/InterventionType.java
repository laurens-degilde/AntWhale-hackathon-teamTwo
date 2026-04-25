package com.corridorapi.enums;

/**
 * Intervention archetype with a typical cost range (EUR). Costs are order-of-magnitude
 * planning figures sourced from Dutch MJPO programme reporting and EU LIFE project
 * post-completion budgets — refine per project before publishing to a stakeholder.
 */
public enum InterventionType {
    ECODUCT(2_000_000, 8_000_000, "wildlife overpass spanning a major road or rail line"),
    WILDLIFE_UNDERPASS(200_000, 800_000, "underpass dimensioned for medium-large mammals"),
    SMALL_MAMMAL_CULVERT(15_000, 60_000, "small culvert / pipe, often retrofitted alongside drainage"),
    AMPHIBIAN_TUNNEL(40_000, 150_000, "linear amphibian tunnel with drift fencing"),
    HEDGEROW_PLANTING(8, 15, "linear hedgerow planting (cost is per metre)"),
    WILDFLOWER_STRIP(2, 6, "field-edge wildflower strip (cost is per square metre)"),
    FENCE_MODIFICATION(50, 200, "wildlife-permeable fence modification (cost is per metre)"),
    FENCE_REMOVAL(5, 20, "fence removal (cost is per metre)"),
    STEPPING_STONE_WOODLAND(20_000, 80_000, "small woodland block as stepping stone (per hectare)"),
    STEPPING_STONE_POND(8_000, 25_000, "small pond / wetland as amphibian stepping stone"),
    STEPPING_STONE_GRASSLAND(5_000, 15_000, "rough grassland creation as stepping stone (per hectare)");

    private final double minCostEur;
    private final double maxCostEur;
    private final String description;

    InterventionType(double minCostEur, double maxCostEur, String description) {
        this.minCostEur = minCostEur;
        this.maxCostEur = maxCostEur;
        this.description = description;
    }

    public double getMinCostEur() { return minCostEur; }
    public double getMaxCostEur() { return maxCostEur; }
    public String getDescription() { return description; }
}
