package com.corridorapi.service;

import com.corridorapi.model.response.LandCoverClass;
import com.corridorapi.model.response.LandCoverResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class LandCoverService {

    // TODO: replace with a live call to the Copernicus Land Monitoring Service.
    //  Candidate endpoints (require account/API key):
    //   - https://land.copernicus.eu/global/products/lc  (CGLS-LC100)
    //   - https://wekeo.eu (Sentinel-2 derived 10m products via Harmonized Data Access API)
    //   - WMS/WCS: https://land.copernicus.eu/imagery-in-situ/global-image-mosaics/sentinel-2-global-mosaic
    //  When wired up: parse the raster summary for the bbox at the requested resolution and
    //  fold same-class fractions into the LandCoverClass list below.
    public LandCoverResponse fetch(double minLng, double minLat, double maxLng, double maxLat, String resolution) {
        log.info("LandCover stub bbox=[{},{},{},{}] resolution={}", minLng, minLat, maxLng, maxLat, resolution);

        List<LandCoverClass> classes = List.of(
            // CORINE Land Cover code, label, plausible NL countryside mix.
            LandCoverClass.builder().code(311).label("Broad-leaved forest").coveragePct(11.4).build(),
            LandCoverClass.builder().code(312).label("Coniferous forest").coveragePct(7.2).build(),
            LandCoverClass.builder().code(313).label("Mixed forest").coveragePct(4.1).build(),
            LandCoverClass.builder().code(211).label("Non-irrigated arable land").coveragePct(34.6).build(),
            LandCoverClass.builder().code(231).label("Pastures").coveragePct(18.9).build(),
            LandCoverClass.builder().code(112).label("Discontinuous urban fabric").coveragePct(9.8).build(),
            LandCoverClass.builder().code(122).label("Road and rail networks").coveragePct(2.7).build(),
            LandCoverClass.builder().code(411).label("Inland marshes").coveragePct(1.8).build(),
            LandCoverClass.builder().code(512).label("Water bodies").coveragePct(3.4).build(),
            LandCoverClass.builder().code(324).label("Transitional woodland-shrub").coveragePct(6.1).build()
        );

        return LandCoverResponse.builder()
            .bbox(List.of(minLng, minLat, maxLng, maxLat))
            .resolution(resolution)
            .classes(classes)
            .source("copernicus")
            .build();
    }
}
