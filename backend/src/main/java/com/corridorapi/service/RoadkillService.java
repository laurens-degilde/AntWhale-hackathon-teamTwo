package com.corridorapi.service;

import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.RoadkillObservation;
import com.corridorapi.model.response.RoadkillResponse;
import com.corridorapi.model.response.TaxonRef;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

@Slf4j
@Service
public class RoadkillService {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<>() {};

    private final WebClient inaturalist;

    public RoadkillService(@Qualifier("inaturalistWebClient") WebClient inaturalist) {
        this.inaturalist = inaturalist;
    }

    public RoadkillResponse fetch(String taxonName, Integer placeId,
                                  Double lat, Double lng, Double radiusKm,
                                  int perPage, int page) {

        Function<UriBuilder, URI> uriFn = b -> {
            UriBuilder ub = b.path("/observations")
                // iNaturalist roadkill custom field filter
                .queryParam("field:Roadkill", "yes")
                .queryParam("per_page", perPage)
                .queryParam("page", page);
            if (taxonName != null && !taxonName.isBlank()) ub.queryParam("taxon_name", taxonName);
            if (placeId != null) ub.queryParam("place_id", placeId);
            if (lat != null) ub.queryParam("lat", lat);
            if (lng != null) ub.queryParam("lng", lng);
            if (radiusKm != null) ub.queryParam("radius", radiusKm);
            return ub.build();
        };

        Map<String, Object> raw = inaturalist.get()
            .uri(uriFn)
            .retrieve()
            .bodyToMono(MAP_TYPE)
            .block();

        if (raw == null) {
            return RoadkillResponse.builder().total(0).page(page).results(List.of()).build();
        }

        Integer total = toInt(raw.get("total_results"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) raw.getOrDefault("results", List.of());

        List<RoadkillObservation> mapped = results.stream().map(this::mapObservation).toList();
        return RoadkillResponse.builder()
            .total(total != null ? total : mapped.size())
            .page(page)
            .results(mapped)
            .build();
    }

    @SuppressWarnings("unchecked")
    private RoadkillObservation mapObservation(Map<String, Object> r) {
        Map<String, Object> taxon = (Map<String, Object>) r.getOrDefault("taxon", Map.of());

        GeoPoint loc = null;
        Object rawLoc = r.get("location"); // iNat: "lat,lng" string OR null; geojson under r.geojson
        if (rawLoc instanceof String s && !s.isBlank() && s.contains(",")) {
            String[] parts = s.split(",", 2);
            loc = parsePoint(parts[0], parts[1]);
        }
        if (loc == null) {
            // fallback: separate latitude / longitude string fields
            loc = parsePoint(r.get("latitude"), r.get("longitude"));
        }

        return RoadkillObservation.builder()
            .id(toLong(r.get("id")))
            .observedOn(asString(r.get("observed_on")))
            .taxon(TaxonRef.builder()
                .id(toLong(taxon.get("id")))
                .name(asString(taxon.get("name")))
                .commonName(asString(taxon.get("preferred_common_name")))
                .build())
            .location(loc)
            .placeGuess(asString(r.get("place_guess")))
            .qualityGrade(asString(r.get("quality_grade")))
            .uri(asString(r.get("uri")))
            .source("inaturalist")
            .build();
    }

    private GeoPoint parsePoint(Object lat, Object lng) {
        Double dLat = toDouble(lat);
        Double dLng = toDouble(lng);
        if (dLat == null || dLng == null) return null;
        return GeoPoint.builder().lat(dLat).lng(dLng).build();
    }

    private static String asString(Object o) {
        return o == null ? null : o.toString();
    }

    private static Integer toInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(o.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static Long toLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try { return Long.parseLong(o.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        String s = Optional.of(o.toString()).map(String::trim).orElse("");
        if (s.isEmpty()) return null;
        try { return Double.parseDouble(s); } catch (NumberFormatException e) { return null; }
    }
}
