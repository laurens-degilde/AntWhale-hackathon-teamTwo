package com.corridorapi.service;

import com.corridorapi.model.response.NaturalCapitalIndicator;
import com.corridorapi.model.response.NaturalCapitalResponse;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Atlas Natuurlijk Kapitaal — ecosystem-services indicators.
 *
 * STUB. Live wiring should call the Atlas WFS / WMS:
 *   https://www.atlasnatuurlijkkapitaal.nl/
 *   https://service.pdok.nl/.../atlasnatuurlijkkapitaal/...
 * The Atlas exposes raster layers per indicator (carbon storage, pollination,
 * water retention, recreation potential, etc.). Real implementation would
 * sample each raster within the bbox and return mean values.
 */
@Service
public class AtlasNaturalCapitalService {

    public NaturalCapitalResponse fetch(double[] bbox) {
        List<NaturalCapitalIndicator> indicators = List.of(
            NaturalCapitalIndicator.builder()
                .code("carbon_storage")
                .name("Koolstofopslag bovengronds + bodem")
                .unit("ton C / ha")
                .value(82.4)
                .description("Combined above-ground biomass + soil organic carbon density.")
                .build(),
            NaturalCapitalIndicator.builder()
                .code("pollination")
                .name("Bestuivingsdienst")
                .unit("index 0-100")
                .value(54.0)
                .description("Wild-pollinator habitat suitability index.")
                .build(),
            NaturalCapitalIndicator.builder()
                .code("water_retention")
                .name("Waterberging")
                .unit("mm")
                .value(38.6)
                .description("Effective rainfall retention capacity of the soil-vegetation column.")
                .build(),
            NaturalCapitalIndicator.builder()
                .code("recreation")
                .name("Recreatieve aantrekkelijkheid")
                .unit("index 0-100")
                .value(71.0)
                .description("Composite of accessibility, scenic quality, and natural-area density.")
                .build(),
            NaturalCapitalIndicator.builder()
                .code("biodiversity_intactness")
                .name("Biodiversiteits-intactheid")
                .unit("index 0-1")
                .value(0.62)
                .description("PREDICTS-style intactness relative to undisturbed reference.")
                .build()
        );

        return NaturalCapitalResponse.builder()
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .atlasUrl("https://www.atlasnatuurlijkkapitaal.nl/")
            .indicators(indicators)
            .source("atlas-natuurlijk-kapitaal")
            .status("STUB")
            .build();
    }
}
