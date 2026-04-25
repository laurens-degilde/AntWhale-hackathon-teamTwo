package com.corridorapi.service;

import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.RoadkillObservation;
import com.corridorapi.model.response.RoadkillResponse;
import com.corridorapi.model.response.TaxonRef;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Waarneming.nl "verkeerslachtoffers" (traffic victims) section.
 *
 * STUB. The verkeerslachtoffers feed is not in the public Waarneming v1 API; it
 * lives behind the partner/observation export endpoints which require a token
 * issued via Stichting Observation International. When a token is added, swap
 * this stub for a real call to:
 *   https://waarneming.nl/api/v1/observations/?observation_type=roadkill
 * (or the partner export with `species_group=verkeerslachtoffers`).
 *
 * Returns a small set of plausible NL-Veluwe roadkill records so the frontend
 * can develop its heatmap layer against real-shaped data.
 */
@Service
public class WaarnemingRoadkillService {

    public RoadkillResponse fetch(int limit) {
        List<RoadkillObservation> all = List.of(
            obs(101L, "2025-09-12", 9999L, "Meles meles", "Eurasian badger",
                52.3041, 5.7521, "A28 nabij Hulshorst", "research"),
            obs(102L, "2025-08-04", 9999L, "Meles meles", "Eurasian badger",
                52.1582, 5.7842, "A1 Kootwijk", "research"),
            obs(103L, "2025-07-21", 8888L, "Lutra lutra", "Eurasian otter",
                52.5017, 5.9123, "N307 Roggebotsluis", "research"),
            obs(104L, "2025-06-08", 7777L, "Erinaceus europaeus", "European hedgehog",
                52.0944, 5.6630, "N304 Otterlo", "casual"),
            obs(105L, "2025-05-30", 6666L, "Vulpes vulpes", "red fox",
                52.2511, 6.1408, "N348 nabij Olst", "research"),
            obs(106L, "2025-05-12", 5555L, "Capreolus capreolus", "roe deer",
                52.0297, 6.0078, "N785 Veluwezoom", "research"),
            obs(107L, "2025-04-19", 4444L, "Bufo bufo", "common toad",
                51.9889, 5.8742, "N310 Otterlo", "research")
        );
        int n = Math.min(limit, all.size());
        return RoadkillResponse.builder()
            .total(all.size())
            .page(1)
            .results(all.subList(0, n))
            .build();
    }

    private static RoadkillObservation obs(long id, String date, long taxonId, String name, String common,
                                           double lat, double lng, String place, String quality) {
        return RoadkillObservation.builder()
            .id(id)
            .observedOn(date)
            .taxon(TaxonRef.builder().id(taxonId).name(name).commonName(common).build())
            .location(GeoPoint.builder().lat(lat).lng(lng).build())
            .placeGuess(place)
            .qualityGrade(quality)
            .uri(null)
            .source("waarneming-verkeerslachtoffers")
            .build();
    }
}
