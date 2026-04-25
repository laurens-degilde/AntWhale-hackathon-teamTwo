package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class LandCoverResponse {
    List<Double> bbox;
    String resolution;
    List<LandCoverClass> classes;
    String source;
}
