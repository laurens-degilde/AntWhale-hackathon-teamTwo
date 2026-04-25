package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TaxonRef {
    Long id;
    String name;
    String commonName;
}
