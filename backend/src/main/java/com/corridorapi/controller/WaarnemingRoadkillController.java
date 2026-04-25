package com.corridorapi.controller;

import com.corridorapi.model.response.RoadkillResponse;
import com.corridorapi.service.WaarnemingRoadkillService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/waarneming-roadkills")
@RequiredArgsConstructor
@Validated
public class WaarnemingRoadkillController {

    private final WaarnemingRoadkillService service;

    @GetMapping
    public RoadkillResponse get(
            @RequestParam(defaultValue = "100") @Min(1) @Max(500) int limit) {
        return service.fetch(limit);
    }
}
