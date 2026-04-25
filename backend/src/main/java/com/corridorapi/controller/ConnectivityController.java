package com.corridorapi.controller;

import com.corridorapi.enums.SpeciesType;
import com.corridorapi.model.response.ConnectivityResponse;
import com.corridorapi.service.ConnectivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/connectivity")
@RequiredArgsConstructor
public class ConnectivityController {

    private final ConnectivityService connectivityService;

    @GetMapping
    public ConnectivityResponse get(
            @RequestParam String species,
            @RequestParam String bbox,
            @RequestParam(defaultValue = "CIRCUITSCAPE") String engine) {
        SpeciesType s = SpeciesType.fromKey(species);
        if (!engine.equals("CIRCUITSCAPE") && !engine.equals("OMNISCAPE")) {
            throw new IllegalArgumentException("engine must be 'CIRCUITSCAPE' or 'OMNISCAPE'");
        }
        double[] b = LandCoverController.parseBbox(bbox);
        return connectivityService.compute(s, b, engine);
    }
}
