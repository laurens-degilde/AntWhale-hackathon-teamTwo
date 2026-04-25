package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.SubsidyApplicationResponse;
import com.corridorapi.service.SubsidyApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outputs/subsidy-applications")
@RequiredArgsConstructor
public class SubsidyApplicationController {

    private final SubsidyApplicationService service;

    @GetMapping
    public SubsidyApplicationResponse get(
            @RequestParam String species,
            @RequestParam String bbox) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        return service.compose(s, b);
    }
}
