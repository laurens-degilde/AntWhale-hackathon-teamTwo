package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class PinchPointResponse {
    String species;
    List<Double> bbox;
    Integer topN;
    String methodology;
    List<PinchPoint> pinchPoints;
    String status;
}
