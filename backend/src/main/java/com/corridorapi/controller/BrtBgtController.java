package com.corridorapi.controller;

import com.corridorapi.model.response.BrtBgtResponse;
import com.corridorapi.service.BrtBgtService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/brt-bgt")
@RequiredArgsConstructor
public class BrtBgtController {

    private final BrtBgtService service;

    @GetMapping
    public BrtBgtResponse get(
            @RequestParam String bbox,
            @RequestParam(defaultValue = "BGT") String dataset) {
        if (!"BRT".equalsIgnoreCase(dataset) && !"BGT".equalsIgnoreCase(dataset)) {
            throw new IllegalArgumentException("dataset must be 'BRT' or 'BGT'");
        }
        double[] b = LandCoverController.parseBbox(bbox);
        return service.fetch(b, dataset);
    }
}
