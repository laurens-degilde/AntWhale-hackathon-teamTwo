package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.GeoPackageManifest;
import com.corridorapi.service.GeoPackageManifestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outputs/geopackage-manifest")
@RequiredArgsConstructor
public class GeoPackageManifestController {

    private final GeoPackageManifestService service;

    @GetMapping
    public GeoPackageManifest get(
            @RequestParam String species,
            @RequestParam String bbox) {
        SpeciesType s = SpeciesType.fromKey(species);
        double[] b = LandCoverController.parseBbox(bbox);
        return service.build(s, b);
    }
}
