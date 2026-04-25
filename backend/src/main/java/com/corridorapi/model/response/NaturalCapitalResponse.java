package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class NaturalCapitalResponse {
    List<Double> bbox;
    String atlasUrl;
    List<NaturalCapitalIndicator> indicators;
    String source;
    String status;
}
