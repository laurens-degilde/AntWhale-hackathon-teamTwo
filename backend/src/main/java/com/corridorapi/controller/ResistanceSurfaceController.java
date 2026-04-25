package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.ResistanceSurfaceResponse;
import com.corridorapi.service.ResistanceSurfaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resistance-surface")
@RequiredArgsConstructor
public class ResistanceSurfaceController {

    private final ResistanceSurfaceService resistanceSurfaceService;

    @GetMapping
    public ResistanceSurfaceResponse get(
            @RequestParam String species,
            @RequestParam String bbox,
            @RequestParam(defaultValue = "100m") String resolution) {

        SpeciesType s = SpeciesType.fromKey(species);

        if (!resolution.equals("100m") && !resolution.equals("250m")) {
            throw new IllegalArgumentException("resolution must be '100m' or '250m'");
        }

        double[] b = LandCoverController.parseBbox(bbox);
        return resistanceSurfaceService.generate(s, b, resolution);
    }
}
