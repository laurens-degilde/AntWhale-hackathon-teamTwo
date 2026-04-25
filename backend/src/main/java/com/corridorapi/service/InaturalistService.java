package com.corridorapi.service;

import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.SpeciesOccurrence;
import com.corridorapi.model.response.SpeciesOccurrenceResponse;
import com.corridorapi.model.response.SpeciesRef;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** General iNaturalist observations (no roadkill filter). */
@Service
public class InaturalistService {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<>() {};

    private final WebClient inat;

    public InaturalistService(@Qualifier("inaturalistWebClient") WebClient inat) {
        this.inat = inat;
    }

    public SpeciesOccurrenceResponse fetch(String taxonName, Integer placeId,
                                           Double lat, Double lng, Double radiusKm,
                                           int perPage, int page) {
        Function<UriBuilder, URI> uriFn = b -> {
            UriBuilder ub = b.path("/observations")
                .queryParam("per_page", perPage)
                .queryParam("page", page)
                .queryParam("geoprivacy", "open");
            if (taxonName != null && !taxonName.isBlank()) ub.queryParam("taxon_name", taxonName);
            if (placeId != null) ub.queryParam("place_id", placeId);
            if (lat != null) ub.queryParam("lat", lat);
            if (lng != null) ub.queryParam("lng", lng);
            if (radiusKm != null) ub.queryParam("radius", radiusKm);
            return ub.build();
        };

        Map<String, Object> raw = inat.get()
            .uri(uriFn)
            .retrieve()
            .bodyToMono(MAP_TYPE)
            .block();

        if (raw == null) {
            return SpeciesOccurrenceResponse.builder().total(0).results(List.of()).build();
        }

        Integer total = toInt(raw.get("total_results"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) raw.getOrDefault("results", List.of());

        List<SpeciesOccurrence> mapped = results.stream().map(this::map).toList();
        return SpeciesOccurrenceResponse.builder()
            .total(total != null ? total : mapped.size())
            .results(mapped)
            .build();
    }

    @SuppressWarnings("unchecked")
    private SpeciesOccurrence map(Map<String, Object> r) {
        Map<String, Object> taxon = (Map<String, Object>) r.getOrDefault("taxon", Map.of());

        GeoPoint loc = null;
        Object rawLoc = r.get("location");
        if (rawLoc instanceof String s && s.contains(",")) {
            String[] parts = s.split(",", 2);
            loc = parsePoint(parts[0], parts[1]);
        }

        return SpeciesOccurrence.builder()
            .id(toLong(r.get("id")))
            .species(SpeciesRef.builder()
                .id(toLong(taxon.get("id")))
                .name(asString(taxon.get("name")))
                .vernacularName(asString(taxon.get("preferred_common_name")))
                .build())
            .date(asString(r.get("observed_on")))
            .location(loc)
            .count(null)
            .source("inaturalist")
            .build();
    }

    private static GeoPoint parsePoint(Object lat, Object lng) {
        Double dLat = toDouble(lat);
        Double dLng = toDouble(lng);
        if (dLat == null || dLng == null) return null;
        return GeoPoint.builder().lat(dLat).lng(dLng).build();
    }

    private static String asString(Object o) { return o == null ? null : o.toString(); }
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
        try { return Double.parseDouble(o.toString()); } catch (NumberFormatException e) { return null; }
    }
}
