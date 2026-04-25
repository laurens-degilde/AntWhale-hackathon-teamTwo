package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class StakeholderMapResponse {
    String species;
    List<Double> bbox;
    List<Stakeholder> stakeholders;
    String status;
}
