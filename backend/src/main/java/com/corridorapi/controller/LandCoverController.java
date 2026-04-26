package com.corridorapi.controller;

import com.corridorapi.model.response.LandCoverResponse;
import com.corridorapi.service.LandCoverService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/land-cover")
@RequiredArgsConstructor
public class LandCoverController {

    private final LandCoverService landCoverService;

    @GetMapping
    public LandCoverResponse get(
            @RequestParam String bbox,
            @RequestParam(defaultValue = "100m") String resolution) {
        if (!resolution.equals("100m") && !resolution.equals("10m")) {
            throw new IllegalArgumentException("resolution must be '100m' or '10m'");
        }
        double[] b = parseBbox(bbox);
        return landCoverService.fetch(b[0], b[1], b[2], b[3], resolution);
    }

    public static double[] parseBbox(String bbox) {
        String[] parts = bbox.split(",");
        if (parts.length != 4) {
            throw new IllegalArgumentException("bbox must have 4 comma-separated values: minLng,minLat,maxLng,maxLat");
        }
        try {
            double minLng = Double.parseDouble(parts[0].trim());
            double minLat = Double.parseDouble(parts[1].trim());
            double maxLng = Double.parseDouble(parts[2].trim());
            double maxLat = Double.parseDouble(parts[3].trim());
            if (minLng >= maxLng || minLat >= maxLat) {
                throw new IllegalArgumentException("bbox min must be less than max for both axes");
            }
            return new double[]{minLng, minLat, maxLng, maxLat};
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("bbox values must be numeric: " + bbox);
        }
    }
}
