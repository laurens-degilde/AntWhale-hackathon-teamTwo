package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.HabitatPatchResponse;
import com.corridorapi.service.HabitatPatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/habitat-patches")
@RequiredArgsConstructor
public class HabitatPatchController {

    private final HabitatPatchService habitatPatchService;

    @GetMapping
    public HabitatPatchResponse get(
            @RequestParam String species,
            @RequestParam String bbox) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        return habitatPatchService.derive(s, b);
    }
}
