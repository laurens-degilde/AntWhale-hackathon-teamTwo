package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ResistanceSurfaceResponse {
    String species;
    List<Double> bbox;
    String resolution;
    String status;
    String message;
    String methodology;
    List<ResistanceCoefficient> resistanceCoefficients;
}
