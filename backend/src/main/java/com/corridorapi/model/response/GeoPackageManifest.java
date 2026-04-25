package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class GeoPackageManifest {
    String species;
    List<Double> bbox;
    String filenameSuggestion;
    String crs;
    List<GeoPackageLayer> layers;
    String status;
    String note;
}
