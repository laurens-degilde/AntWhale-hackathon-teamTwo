package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class SubsidyApplicationResponse {
    String species;
    List<Double> bbox;
    List<SubsidyApplication> applications;
    String status;
    String note;
}
