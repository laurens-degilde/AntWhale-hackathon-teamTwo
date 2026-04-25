package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class InterventionResponse {
    String species;
    List<Double> bbox;
    String methodology;
    List<Intervention> interventions;
    String status;
}
