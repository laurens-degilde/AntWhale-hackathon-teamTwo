package com.corridorapi.service;

import com.corridorapi.model.response.GeoPoint;
import com.corridorapi.model.response.SpeciesOccurrence;
import com.corridorapi.model.response.SpeciesOccurrenceResponse;
import com.corridorapi.model.response.SpeciesRef;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Service
public class GbifService {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
        new ParameterizedTypeReference<>() {};

    private final WebClient gbif;

    public GbifService(@Qualifier("gbifWebClient") WebClient gbif) {
        this.gbif = gbif;
    }

    public SpeciesOccurrenceResponse fetch(long taxonKey,
                                           Double lat, Double lng, Double radiusKm,
                                           String dateAfter, String dateBefore,
                                           int limit, int offset) {
        Function<UriBuilder, URI> uriFn = b -> {
            UriBuilder ub = b.path("/occurrence/search")
                .queryParam("taxonKey", taxonKey)
                .queryParam("limit", limit)
                .queryParam("offset", offset)
                .queryParam("hasCoordinate", true);

            if (lat != null && lng != null && radiusKm != null) {
                // GBIF geoDistance: "lat,lng,distance" — distance accepts km/m suffix
                ub.queryParam("geoDistance", lat + "," + lng + "," + radiusKm + "km");
            }
            if (dateAfter != null || dateBefore != null) {
                String start = (dateAfter != null && !dateAfter.isBlank()) ? dateAfter : "1700-01-01";
                String end = (dateBefore != null && !dateBefore.isBlank()) ? dateBefore : "2100-01-01";
                ub.queryParam("eventDate", start + "," + end);
            }
            return ub.build();
        };

        Map<String, Object> raw = gbif.get()
            .uri(uriFn)
            .retrieve()
            .bodyToMono(MAP_TYPE)
            .block();

        if (raw == null) {
            return SpeciesOccurrenceResponse.builder().total(0).results(List.of()).build();
        }

        Integer total = toInt(raw.get("count"));
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
        // GBIF returns species fields flat on the occurrence record.
        Long speciesKey = toLong(r.getOrDefault("speciesKey", r.getOrDefault("acceptedTaxonKey", r.get("taxonKey"))));
        String scientificName = asString(r.getOrDefault("species", r.get("scientificName")));
        String vernacular = asString(r.get("vernacularName"));

        // Vernacular often nested in "vernacularNames" array on occurrences.
        if (vernacular == null && r.get("vernacularNames") instanceof List<?> vns && !vns.isEmpty()) {
            Object first = vns.get(0);
            if (first instanceof Map<?, ?> vm) {
                vernacular = asString(((Map<String, Object>) vm).get("vernacularName"));
            }
        }

        GeoPoint loc = parsePoint(r.get("decimalLatitude"), r.get("decimalLongitude"));

        return SpeciesOccurrence.builder()
            .id(toLong(r.getOrDefault("key", r.get("gbifID"))))
            .species(SpeciesRef.builder()
                .id(speciesKey)
                .name(scientificName)
                .vernacularName(vernacular)
                .build())
            .date(asString(r.getOrDefault("eventDate", r.get("dateIdentified"))))
            .location(loc)
            .count(toInt(r.get("individualCount")))
            .source("gbif")
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
