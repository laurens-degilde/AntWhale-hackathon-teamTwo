package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class NaturalCapitalIndicator {
    String code;
    String name;
    String unit;
    Double value;
    String description;
}
