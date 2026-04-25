package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class NnnResponse {
    String province;
    List<Double> bbox;
    String pdokService;
    List<NnnLayer> layers;
    String source;
    String status;
}
