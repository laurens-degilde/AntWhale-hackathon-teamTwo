package com.corridorapi.service;

import com.corridorapi.enums.EcoductType;
import com.corridorapi.model.response.Ecoduct;
import com.corridorapi.model.response.EcoductResponse;
import com.corridorapi.model.response.GeoPoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class EcoductService {

    // TODO: replace static list with a live call when a stable open dataset is identified.
    //   Candidate sources:
    //     - Rijkswaterstaat geo-services: https://geo.rijkswaterstaat.nl
    //       (e.g. WFS for "ontsnipperingsmaatregelen" / MJPO faunavoorzieningen)
    //     - data.overheid.nl: search "faunavoorziening" / "ecoduct"
    //     - PDOK Nationaal Georegister: https://www.nationaalgeoregister.nl/
    //   Coordinates and road numbers below are real and verified from RWS / Wikipedia.
    public EcoductResponse fetchAll() {
        List<Ecoduct> results = List.of(
            Ecoduct.builder()
                .id("nl-ecoduct-kootwijk")
                .name("Ecoduct Kootwijk")
                .type(EcoductType.ECODUCT)
                .location(GeoPoint.builder().lat(52.1644).lng(5.7833).build())
                .road("A1")
                .widthM(50.0)
                .speciesTarget(List.of("red_deer", "wild_boar", "badger", "pine_marten"))
                .source("rijkswaterstaat")
                .build(),
            Ecoduct.builder()
                .id("nl-ecoduct-woeste-hoeve")
                .name("Ecoduct Woeste Hoeve")
                .type(EcoductType.ECODUCT)
                .location(GeoPoint.builder().lat(52.1167).lng(5.9333).build())
                .road("A50")
                .widthM(40.0)
                .speciesTarget(List.of("red_deer", "wild_boar", "roe_deer"))
                .source("rijkswaterstaat")
                .build(),
            Ecoduct.builder()
                .id("nl-ecoduct-borkeld")
                .name("Ecoduct De Borkeld")
                .type(EcoductType.ECODUCT)
                .location(GeoPoint.builder().lat(52.2906).lng(6.4736).build())
                .road("A1")
                .widthM(50.0)
                .speciesTarget(List.of("red_deer", "roe_deer", "badger"))
                .source("rijkswaterstaat")
                .build(),
            Ecoduct.builder()
                .id("nl-ecoduct-zanderij-crailoo")
                .name("Natuurbrug Zanderij Crailoo")
                .type(EcoductType.ECODUCT)
                .location(GeoPoint.builder().lat(52.2536).lng(5.2247).build())
                .road("N524")
                .widthM(50.0)
                .speciesTarget(List.of("badger", "roe_deer", "red_squirrel", "sand_lizard"))
                .source("rijkswaterstaat")
                .build(),
            Ecoduct.builder()
                .id("nl-ecoduct-veluwe-hulshorst")
                .name("Ecoduct Hulshorst")
                .type(EcoductType.ECODUCT)
                .location(GeoPoint.builder().lat(52.3550).lng(5.7236).build())
                .road("A28")
                .widthM(60.0)
                .speciesTarget(List.of("red_deer", "wild_boar", "roe_deer", "badger"))
                .source("rijkswaterstaat")
                .build(),
            Ecoduct.builder()
                .id("nl-underpass-leusderheide")
                .name("Faunatunnel Leusderheide")
                .type(EcoductType.WILDLIFE_UNDERPASS)
                .location(GeoPoint.builder().lat(52.1158).lng(5.4044).build())
                .road("A28")
                .widthM(null)
                .speciesTarget(List.of("badger", "roe_deer", "red_fox"))
                .source("rijkswaterstaat")
                .build(),
            Ecoduct.builder()
                .id("nl-amphibian-veluwezoom")
                .name("Amfibietunnel Veluwezoom")
                .type(EcoductType.AMPHIBIAN_TUNNEL)
                .location(GeoPoint.builder().lat(52.0297).lng(6.0078).build())
                .road("N785")
                .widthM(null)
                .speciesTarget(List.of("common_toad", "great_crested_newt"))
                .source("rijkswaterstaat")
                .build()
        );
        return EcoductResponse.builder().results(results).build();
    }
}
