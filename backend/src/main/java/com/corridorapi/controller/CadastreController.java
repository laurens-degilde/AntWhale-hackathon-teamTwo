package com.corridorapi.controller;

import com.corridorapi.model.response.CadastralResponse;
import com.corridorapi.service.KadasterService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cadastre/parcels")
@RequiredArgsConstructor
@Validated
public class CadastreController {

    private final KadasterService kadasterService;

    @GetMapping
    public CadastralResponse get(
            @RequestParam String bbox,
            @RequestParam(defaultValue = "100") @Min(1) @Max(500) int limit) {
        double[] b = LandCoverController.parseBbox(bbox);
        return kadasterService.fetch(b, limit);
    }
}
