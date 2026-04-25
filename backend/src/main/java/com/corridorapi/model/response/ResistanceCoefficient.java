package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ResistanceCoefficient {
    String landCoverClass;
    Double value;       // 1 = easy, 1000 = effective barrier
    String citation;    // peer-reviewed source for this specific value
}
