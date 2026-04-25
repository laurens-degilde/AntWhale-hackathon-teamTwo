package com.corridorapi.controller;

import com.corridorapi.model.request.ChangeDetectionRequest;
import com.corridorapi.model.response.ChangeDetectionResponse;
import com.corridorapi.service.ChangeDetectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/change-detection")
@RequiredArgsConstructor
public class ChangeDetectionController {

    private final ChangeDetectionService service;

    @PostMapping
    public ChangeDetectionResponse post(@Valid @RequestBody ChangeDetectionRequest body) {
        return service.diff(body);
    }
}
