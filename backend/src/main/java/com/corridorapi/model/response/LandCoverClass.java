package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LandCoverClass {
    Integer code;
    String label;
    Double coveragePct;
}
