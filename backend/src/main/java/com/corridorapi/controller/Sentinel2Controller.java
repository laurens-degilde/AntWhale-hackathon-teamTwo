package com.corridorapi.controller;

import com.corridorapi.model.response.Sentinel2Response;
import com.corridorapi.service.Sentinel2Service;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sentinel2-imagery")
@RequiredArgsConstructor
@Validated
public class Sentinel2Controller {

    private final Sentinel2Service sentinel2Service;

    @GetMapping
    public Sentinel2Response get(
            @RequestParam String bbox,
            @RequestParam(required = false) String dateAfter,
            @RequestParam(required = false) String dateBefore,
            @RequestParam(defaultValue = "20") @Min(0) @Max(100) int maxCloudCoverPct) {
        double[] b = LandCoverController.parseBbox(bbox);
        return sentinel2Service.fetch(b, dateAfter, dateBefore, maxCloudCoverPct);
    }
}
