package com.corridorapi.controller;

import com.corridorapi.service.OsmFeaturesService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/osm-features")
@RequiredArgsConstructor
public class OsmFeaturesController {

    private final OsmFeaturesService osmFeaturesService;

    @GetMapping
    public Map<String, Object> get(
            @RequestParam String bbox,
            @RequestParam(defaultValue = "roads,waterways") String featureTypes) {
        List<String> ft = Arrays.stream(featureTypes.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
        if (ft.isEmpty()) {
            throw new IllegalArgumentException("featureTypes must include at least one value");
        }
        return osmFeaturesService.fetch(bbox, ft);
    }
}
