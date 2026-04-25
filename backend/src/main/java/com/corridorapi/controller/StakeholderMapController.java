package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.StakeholderMapResponse;
import com.corridorapi.service.StakeholderMapService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outputs/stakeholder-map")
@RequiredArgsConstructor
public class StakeholderMapController {

    private final StakeholderMapService service;

    @GetMapping
    public StakeholderMapResponse get(
            @RequestParam String species,
            @RequestParam String bbox) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        return service.build(s, b);
    }
}
