package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class HabitatPatchResponse {
    String species;
    List<Double> bbox;
    Double minPatchHa;        // species-specific minimum patch size threshold
    String methodology;
    List<HabitatPatch> patches;
    String status;
}
