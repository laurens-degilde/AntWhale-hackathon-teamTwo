package com.corridorapi.model.response;

import com.corridorapi.enums.InterventionType;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class Intervention {
    String id;
    String pinchPointId;
    InterventionType type;
    GeoPoint location;
    Double minCostEur;
    Double maxCostEur;
    String costNote;
    Double connectivityBenefit;       // expected fractional uplift in current density
    Double costEffectivenessScore;    // benefit / midCost (higher = better value)
    Integer rank;                     // 1 = highest cost-effectiveness
    String description;
}
