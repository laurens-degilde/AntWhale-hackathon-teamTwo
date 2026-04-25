package com.corridorapi.controller;

import com.corridorapi.model.response.SpeciesOccurrenceResponse;
import com.corridorapi.service.GbifService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/species-occurrences")
@RequiredArgsConstructor
@Validated
public class SpeciesOccurrenceController {

    private final GbifService gbifService;

    @GetMapping
    public SpeciesOccurrenceResponse get(
            @RequestParam long taxonKey,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false) String dateAfter,
            @RequestParam(required = false) String dateBefore,
            @RequestParam(defaultValue = "100") @Min(1) @Max(300) int limit,
            @RequestParam(defaultValue = "0") @Min(0) int offset) {
        return gbifService.fetch(taxonKey, lat, lng, radiusKm, dateAfter, dateBefore, limit, offset);
    }
}
