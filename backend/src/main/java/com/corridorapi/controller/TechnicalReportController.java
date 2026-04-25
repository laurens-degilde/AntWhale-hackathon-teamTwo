package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.TechnicalReport;
import com.corridorapi.service.TechnicalReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outputs/technical-report")
@RequiredArgsConstructor
public class TechnicalReportController {

    private final TechnicalReportService service;

    @GetMapping
    public TechnicalReport get(
            @RequestParam String species,
            @RequestParam String bbox) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        return service.build(s, b);
    }
}
