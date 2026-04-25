package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SpeciesRef {
    Long id;
    String name;
    String vernacularName;
}
