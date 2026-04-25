package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class Sentinel2Response {
    List<Double> bbox;
    String dateAfter;
    String dateBefore;
    Integer maxCloudCoverPct;
    String stacEndpoint;
    List<Sentinel2Item> items;
    String source;
    String status;
}
