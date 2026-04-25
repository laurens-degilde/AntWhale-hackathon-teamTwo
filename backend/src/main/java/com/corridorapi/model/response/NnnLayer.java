package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class NnnLayer {
    String id;
    String name;
    String category;       // "Bestaande natuur", "Nieuwe natuur", "Ecologische verbinding"
    Double areaHa;
    String province;
    GeoPoint centroid;
    String beheerType;     // SNL beheertype code, e.g. "N16.04 Vochtig bos met productie"
}
