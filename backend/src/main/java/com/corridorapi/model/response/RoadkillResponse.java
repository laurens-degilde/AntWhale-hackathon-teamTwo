package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class RoadkillResponse {
    Integer total;
    Integer page;
    List<RoadkillObservation> results;
}
