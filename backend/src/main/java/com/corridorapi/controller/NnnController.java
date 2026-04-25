package com.corridorapi.controller;

import com.corridorapi.model.response.NnnResponse;
import com.corridorapi.service.NnnService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/nnn")
@RequiredArgsConstructor
public class NnnController {

    private final NnnService service;

    @GetMapping
    public NnnResponse get(
            @RequestParam(defaultValue = "Gelderland") String province,
            @RequestParam String bbox) {
        double[] b = LandCoverController.parseBbox(bbox);
        return service.fetch(province, b);
    }
}
