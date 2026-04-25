package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class CadastralResponse {
    List<Double> bbox;
    String pdokService;
    List<CadastralParcel> parcels;
    String source;
    String status;
    String note;
}
