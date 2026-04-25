package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class GeoPoint {
    Double lat;
    Double lng;
}
