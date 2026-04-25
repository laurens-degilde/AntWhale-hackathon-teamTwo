package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.InterventionResponse;
import com.corridorapi.service.InterventionService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interventions")
@RequiredArgsConstructor
@Validated
public class InterventionController {

    private final InterventionService interventionService;

    @GetMapping
    public InterventionResponse get(
            @RequestParam String species,
            @RequestParam String bbox,
            @RequestParam(defaultValue = "5") @Min(1) @Max(50) int topN) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        return interventionService.classify(s, b, topN);
    }
}
