package com.corridorapi.controller;

import com.corridorapi.model.response.NaturalCapitalResponse;
import com.corridorapi.service.AtlasNaturalCapitalService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/atlas-natuurlijk-kapitaal")
@RequiredArgsConstructor
public class AtlasNaturalCapitalController {

    private final AtlasNaturalCapitalService service;

    @GetMapping
    public NaturalCapitalResponse get(@RequestParam String bbox) {
        double[] b = LandCoverController.parseBbox(bbox);
        return service.fetch(b);
    }
}
