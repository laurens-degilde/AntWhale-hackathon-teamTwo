package com.corridorapi.controller;

import com.corridorapi.model.response.RoadkillResponse;
import com.corridorapi.service.RoadkillService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roadkills")
@RequiredArgsConstructor
@Validated
public class RoadkillController {

    private final RoadkillService roadkillService;

    @GetMapping
    public RoadkillResponse get(
            @RequestParam(required = false) String taxonName,
            @RequestParam(required = false) Integer placeId,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radius,
            @RequestParam(defaultValue = "100") @Min(1) @Max(200) int perPage,
            @RequestParam(defaultValue = "1") @Min(1) int page) {
        return roadkillService.fetch(taxonName, placeId, lat, lng, radius, perPage, page);
    }
}
