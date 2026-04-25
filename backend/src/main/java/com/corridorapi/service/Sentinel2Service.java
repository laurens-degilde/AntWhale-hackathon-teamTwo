package com.corridorapi.service;

import com.corridorapi.model.response.Sentinel2Item;
import com.corridorapi.model.response.Sentinel2Response;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Sentinel-2 L2A imagery references via the public Element 84 STAC API.
 *
 * STUB: returns three plausible recent Sentinel-2 items so the frontend can
 * develop its imagery panel. Real implementation will POST to
 *   https://earth-search.aws.element84.com/v1/search
 * with `collections=sentinel-2-l2a`, `bbox`, `datetime`, and `query.eo:cloud_cover`.
 */
@Service
public class Sentinel2Service {

    public Sentinel2Response fetch(double[] bbox, String dateAfter, String dateBefore, int maxCloud) {
        String stacEndpoint = "https://earth-search.aws.element84.com/v1/search";

        List<Sentinel2Item> items = List.of(
            Sentinel2Item.builder()
                .id("S2B_31UFT_20251008_0_L2A")
                .datetime("2025-10-08T10:30:00Z")
                .cloudCoverPct(4.2)
                .thumbnailUrl("https://example/thumbs/S2B_31UFT_20251008.jpg")
                .visualAssetUrl("https://example/cog/S2B_31UFT_20251008/visual.tif")
                .stacItemUrl("https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_31UFT_20251008_0_L2A")
                .epsg(32631)
                .build(),
            Sentinel2Item.builder()
                .id("S2A_31UFT_20250923_0_L2A")
                .datetime("2025-09-23T10:30:00Z")
                .cloudCoverPct(11.7)
                .thumbnailUrl("https://example/thumbs/S2A_31UFT_20250923.jpg")
                .visualAssetUrl("https://example/cog/S2A_31UFT_20250923/visual.tif")
                .stacItemUrl("https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_31UFT_20250923_0_L2A")
                .epsg(32631)
                .build(),
            Sentinel2Item.builder()
                .id("S2B_31UFT_20250908_0_L2A")
                .datetime("2025-09-08T10:30:00Z")
                .cloudCoverPct(2.1)
                .thumbnailUrl("https://example/thumbs/S2B_31UFT_20250908.jpg")
                .visualAssetUrl("https://example/cog/S2B_31UFT_20250908/visual.tif")
                .stacItemUrl("https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_31UFT_20250908_0_L2A")
                .epsg(32631)
                .build()
        );

        return Sentinel2Response.builder()
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .dateAfter(dateAfter)
            .dateBefore(dateBefore)
            .maxCloudCoverPct(maxCloud)
            .stacEndpoint(stacEndpoint)
            .items(items)
            .source("sentinel-2-l2a (Element 84 STAC)")
            .status("STUB")
            .build();
    }
}
