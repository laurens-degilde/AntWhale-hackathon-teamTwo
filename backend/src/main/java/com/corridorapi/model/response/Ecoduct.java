package com.corridorapi.model.response;

import com.corridorapi.enums.EcoductType;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class Ecoduct {
    String id;
    String name;
    EcoductType type;
    GeoPoint location;
    String road;
    Double widthM;
    List<String> speciesTarget;
    String source;
}
