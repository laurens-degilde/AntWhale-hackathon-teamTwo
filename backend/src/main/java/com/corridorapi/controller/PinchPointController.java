package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.PinchPointResponse;
import com.corridorapi.service.PinchPointService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pinch-points")
@RequiredArgsConstructor
@Validated
public class PinchPointController {

    private final PinchPointService pinchPointService;

    @GetMapping
    public PinchPointResponse get(
            @RequestParam String species,
            @RequestParam String bbox,
            @RequestParam(defaultValue = "5") @Min(1) @Max(50) int topN) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        return pinchPointService.identify(s, b, topN);
    }
}
