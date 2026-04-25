package com.corridorapi.model.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class GeoPackageLayer {
    String name;
    String geometryType;     // "Raster" | "Polygon" | "LineString" | "Point"
    String crs;              // e.g. "EPSG:28992" (RD New)
    Integer featureCount;
    String description;
}
