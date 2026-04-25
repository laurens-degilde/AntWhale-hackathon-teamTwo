package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class Sentinel2Item {
    String id;
    String datetime;
    Double cloudCoverPct;
    String thumbnailUrl;
    String visualAssetUrl;
    String stacItemUrl;
    Integer epsg;
}
