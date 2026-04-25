package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RoadkillObservation {
    Long id;
    String observedOn;
    TaxonRef taxon;
    GeoPoint location;
    String placeGuess;
    String qualityGrade;
    String uri;
    String source;
}
