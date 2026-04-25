package com.corridorapi.controller;

import com.corridorapi.model.response.EcoductResponse;
import com.corridorapi.service.EcoductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ecoducts")
@RequiredArgsConstructor
public class EcoductController {

    private final EcoductService ecoductService;

    @GetMapping
    public EcoductResponse list() {
        return ecoductService.fetchAll();
    }
}
