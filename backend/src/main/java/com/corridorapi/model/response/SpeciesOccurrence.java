package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SpeciesOccurrence {
    Long id;
    SpeciesRef species;
    String date;
    GeoPoint location;
    Integer count;
    String source;
}
