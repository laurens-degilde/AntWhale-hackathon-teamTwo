package com.corridorapi.service;

import com.corridorapi.model.response.CadastralParcel;
import com.corridorapi.model.response.CadastralResponse;
import com.corridorapi.model.response.GeoPoint;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Kadaster cadastral parcels + ownership.
 *
 * STUB. Two relevant Kadaster sources:
 *   - BRK Kadastrale Kaart (open):
 *       https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0
 *     Geometry + parcel IDs only — no ownership.
 *   - BRK 2.0 Bevragen (auth required):
 *       https://api.brk.kadaster.nl/esd/bevragen/api/v2
 *     Ownership and rights — needs an API key issued via Kadaster.
 *
 * Returned parcels mix synthetic IDs that follow the real BRK aanduiding format
 * (gemeente-sectie-perceelnummer) so the frontend can develop against shaped data.
 */
@Service
public class KadasterService {

    public CadastralResponse fetch(double[] bbox, int limit) {
        double cLat = (bbox[1] + bbox[3]) / 2;
        double cLng = (bbox[0] + bbox[2]) / 2;
        double dLat = (bbox[3] - bbox[1]) / 8;
        double dLng = (bbox[2] - bbox[0]) / 8;

        List<CadastralParcel> all = List.of(
            CadastralParcel.builder()
                .id("EPE00-K-1234")
                .municipality("Epe")
                .section("K")
                .parcelNumber(1234)
                .areaHa(4.21)
                .dominantLandUse("agricultural_field")
                .ownerType("private")
                .ownerName("(geanonimiseerd)")
                .centroid(GeoPoint.builder().lat(cLat - dLat).lng(cLng - dLng).build())
                .build(),
            CadastralParcel.builder()
                .id("EPE00-L-908")
                .municipality("Epe")
                .section("L")
                .parcelNumber(908)
                .areaHa(0.84)
                .dominantLandUse("hedgerow_edge")
                .ownerType("private")
                .ownerName("(geanonimiseerd)")
                .centroid(GeoPoint.builder().lat(cLat - dLat).lng(cLng).build())
                .build(),
            CadastralParcel.builder()
                .id("APD00-A-2412")
                .municipality("Apeldoorn")
                .section("A")
                .parcelNumber(2412)
                .areaHa(12.03)
                .dominantLandUse("forest")
                .ownerType("ngo")
                .ownerName("Stichting Natuurmonumenten")
                .centroid(GeoPoint.builder().lat(cLat).lng(cLng + dLng).build())
                .build(),
            CadastralParcel.builder()
                .id("APD00-D-77")
                .municipality("Apeldoorn")
                .section("D")
                .parcelNumber(77)
                .areaHa(2.16)
                .dominantLandUse("road_verge")
                .ownerType("state")
                .ownerName("Rijkswaterstaat")
                .centroid(GeoPoint.builder().lat(cLat + dLat).lng(cLng).build())
                .build(),
            CadastralParcel.builder()
                .id("VRD00-B-501")
                .municipality("Voorst")
                .section("B")
                .parcelNumber(501)
                .areaHa(7.92)
                .dominantLandUse("agricultural_field")
                .ownerType("private")
                .ownerName("(geanonimiseerd)")
                .centroid(GeoPoint.builder().lat(cLat + dLat).lng(cLng + dLng).build())
                .build()
        );

        int n = Math.min(limit, all.size());
        return CadastralResponse.builder()
            .bbox(List.of(bbox[0], bbox[1], bbox[2], bbox[3]))
            .pdokService("https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0")
            .parcels(all.subList(0, n))
            .source("kadaster (BRK)")
            .status("STUB")
            .note("Geometry layer is open via PDOK; ownership requires BRK 2.0 Bevragen API key. Owner names are placeholders here.")
            .build();
    }
}
