package com.corridorapi.service;

import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.NnnLayer;
import com.corridorapi.model.response.NnnResponse;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Provincial Natuur Netwerk Nederland (NNN) layers.
 *
 * STUB. Each province publishes its own NNN WFS. Aggregated entry points:
 *   - PDOK natuur:  https://service.pdok.nl/provincies/natuurnetwerk-nederland/wfs/v1_0
 *   - Gelderland:   https://services.geodataoverijssel.nl/.../NatuurNetwerk
 *   - Utrecht / Noord-Brabant: see https://geo.bij12.nl
 * The schema typically exposes "type" (existing nature, new nature, ecological connection)
 * and a beheertype code from the SNL beheertypenlijst.
 */
@Service
public class NnnService {

    public NnnResponse fetch(String province, double[] bbox) {
        List<NnnLayer> layers = List.of(
            NnnLayer.builder()
                .id("nnn-veluwe-core")
                .name("Veluwe — kerngebied")
                .category("Bestaande natuur")
                .areaHa(91200.0)
                .province(province)
                .centroid(GeoPoint.builder().lat(52.1).lng(5.85).build())
                .beheerType("N16.04 Vochtig bos met productie")
                .build(),
            NnnLayer.builder()
                .id("nnn-veluwe-nieuw-1")
                .name("Hierdense Beek — nieuwe natuur")
                .category("Nieuwe natuur")
                .areaHa(412.0)
                .province(province)
                .centroid(GeoPoint.builder().lat(52.30).lng(5.78).build())
                .beheerType("N12.02 Kruiden- en faunarijk grasland")
                .build(),
            NnnLayer.builder()
                .id("nnn-verbinding-veluwe-utrechtse-heuvelrug")
                .name("Ecoduct-corridor Veluwe — Utrechtse Heuvelrug")
                .category("Ecologische verbinding")
                .areaHa(120.0)
                .province(province)
                .centroid(GeoPoint.builder().lat(52.04).lng(5.55).build())
                .beheerType("N15.02 Dennen-, eiken- en beukenbos")
                .build()
        );

        return NnnResponse.builder()
            .province(province)
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .pdokService("https://service.pdok.nl/provincies/natuurnetwerk-nederland/wfs/v1_0")
            .layers(layers)
            .source("provinces (via PDOK)")
            .status("STUB")
            .build();
    }
}
